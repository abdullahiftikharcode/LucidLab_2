import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Textarea,
  Image,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { DeleteIcon, DownloadIcon } from '@chakra-ui/icons';
import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useRete } from 'rete-react-render-plugin';
import { createEditor } from '../../components/logic_designer';
import { ExportedNodes } from '../../components/logic_designer/node_exporter';
import UnityViewer from '../../components/unity_viewer';
import { ToolbarProvider, useToolbar } from '../../components/unity_toolbar/useToolbarStore';
import useScene from '../../core/hooks/useScene';
import { SceneState } from '../../core/states/types';
import { ObjectTypesManagerContext } from '../experiment_root';
import SceneObjectComp from './object_comp';

function Rete({
  sceneState,
  setSceneLogicInFirebase,
}: {
  sceneState: SceneState;
  setSceneLogicInFirebase: (nodes: ExportedNodes) => void;
}) {
  const [ref, editor] = useRete(createEditor);
  useEffect(() => {
    let asyncFunc = async () => {
      await editor?.importSceneState(sceneState.sceneLogic ?? {});
      editor?.onSceneStateChange(nodes => {
        setSceneLogicInFirebase(nodes);
      });
    };
    asyncFunc();
  }, [editor]);
  return <Box ref={ref} style={{ width: '100%', height: '100%' }}></Box>;
}

function SceneContent() {
  const { sceneName, expName } = useParams();

  if (!sceneName || !expName) {
    return <Navigate to="/" />;
  }

  const sceneCore = useScene(expName, sceneName);
  const objectTypesManager = useContext(ObjectTypesManagerContext);
  const { selectedObjectName, setSelectedObject } = useToolbar();

  const [selectedObjectType, setSelectedObjectType] = useState<string>('cube');
  const [newObjectName, setNewObjectName] = useState('');

  const createObject = function () {
    sceneCore.addObject(newObjectName, selectedObjectType);
    setNewObjectName('');
  };

  const [tabIndex, setTabIndex] = useState(0);
  const [sceneDesc, setSceneDesc] = useState(sceneCore.scene?.description || '');

  const [markerName, setMarkerName] = useState('');
  const [markerFile, setMarkerFile] = useState<File | null>(null);

  React.useEffect(() => {
    if (sceneCore.scene?.description) {
      setSceneDesc(sceneCore.scene.description);
    }
  }, [sceneCore.scene?.description]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [existingMarkers, setExistingMarkers] = useState<any[]>([]);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);

  const fetchExistingMarkers = async () => {
    setIsLoadingMarkers(true);
    const markers = await sceneCore.listMarkers();
    setExistingMarkers(markers);
    setIsLoadingMarkers(false);
    onOpen();
  };

  const handleMarkerUpload = async () => {
    if (!markerName || !markerFile) return;
    await sceneCore.addMarker(markerName, markerFile);
    setMarkerName('');
    setMarkerFile(null);
    // Reset file input component visually
    const fileInput = document.getElementById('markerFileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSelectExisting = (marker: any) => {
    const defaultMarkers = sceneCore.scene?.markers ?? [];
    if (defaultMarkers.some((m: any) => m.imageUrl === marker.imageUrl)) {
      onClose();
      return;
    }

    // We add it to the current scene's markers in Firestore
    const newMarker = {
      id: `marker_${Date.now()}`,
      name: marker.name.split('.')[0] || marker.name,
      imageUrl: marker.imageUrl
    };

    sceneCore.addMarkerManual(newMarker);
    onClose();
  };

  return (
    <Box
      display="flex"
      gap="4"
      width="100%"
      height="100%"
      justifyContent="space-between"
      padding="1em"
    >
      <React.Suspense fallback={<Skeleton />}>
        <Box width="50%" height="100%" overflowY="auto">
          <Tabs
            index={tabIndex}
            onChange={setTabIndex}
            display="flex"
            flexDir="column"
            height="100%"
          >
            <TabList>
              <Tab>Scene Objects</Tab>
              <Tab>Scene Logic</Tab>
              <Tab>Scene Setup</Tab>
            </TabList>
            <TabPanels flexGrow="1">
              <TabPanel height="100%" display="flex" flexDirection="column" gap="1em">
                <FormControl border="1px" borderRadius="0.5em" p="1em">
                  <FormLabel>Create New Object</FormLabel>
                  <Flex gap="0.5em">
                    <Input
                      value={newObjectName}
                      onChange={e => setNewObjectName(e.target.value)}
                      placeholder="Object Name"
                    />
                    <Select
                      value={selectedObjectType}
                      onChange={e => setSelectedObjectType(e.target.value)}
                      width="20em"
                    >
                      <option value="cube">Cube</option>
                      <option value="sphere">Sphere</option>
                      <option value="capsule">Capsule</option>
                      <option value="cylinder">Cylinder</option>
                      {objectTypesManager.objects.map(type => (
                        <option key={type.name} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </Select>
                    <Button width="10em" onClick={createObject}>
                      Create
                    </Button>
                  </Flex>
                </FormControl>
                <Box flexGrow="1" flexShrink="1" flexBasis="0" overflow="auto">
                  <Flex gap="1em" wrap="wrap">
                    {sceneCore.objects?.map(obj => (
                      <SceneObjectComp
                        key={obj.objectName}
                        sceneObject={sceneCore.getObject(obj.objectName)}
                        isSelected={selectedObjectName === obj.objectName}
                        onSelect={() => {
                          // Toggle selection: if already selected, deselect it
                          setSelectedObject(
                            selectedObjectName === obj.objectName ? null : obj.objectName
                          );
                        }}
                        markers={sceneCore.scene?.markers}
                      />
                    ))}
                  </Flex>
                </Box>
              </TabPanel>
              <TabPanel height="100%">
                {tabIndex === 1 && (
                  <Rete
                    sceneState={sceneCore.scene}
                    setSceneLogicInFirebase={sceneCore.setSceneLogic}
                  />
                )}
              </TabPanel>
              <TabPanel height="100%" display="flex" flexDirection="column" gap="1.5em">
                <Box>
                  <Heading size="md" mb="0.5em">Description</Heading>
                  <Textarea
                    value={sceneDesc}
                    onChange={e => {
                      setSceneDesc(e.target.value);
                      sceneCore.setDescription(e.target.value);
                    }}
                  ></Textarea>
                </Box>

                <Box borderTop="1px solid" borderColor="gray.600" pt="1em">
                  <Heading size="md" mb="0.5em">AR Markers (EduAR Anchors)</Heading>
                  <Flex gap="1em" mb="1em" align="flex-end">
                    <FormControl>
                      <FormLabel>Marker Name</FormLabel>
                      <Input
                        value={markerName}
                        onChange={e => setMarkerName(e.target.value)}
                        placeholder="e.g. Battery Base"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Marker Image</FormLabel>
                      <Input
                        id="markerFileInput"
                        type="file"
                        onChange={e => setMarkerFile(e.target.files?.[0] || null)}
                        accept="image/*"
                        p={1}
                      />
                    </FormControl>
                    <Button
                      colorScheme="blue"
                      onClick={handleMarkerUpload}
                      isDisabled={!markerName || !markerFile}
                    >
                      Upload
                    </Button>
                    <Button
                      variant="outline"
                      onClick={fetchExistingMarkers}
                    >
                      Select Existing
                    </Button>
                  </Flex>

                  <Modal isOpen={isOpen} onClose={onClose} size="xl">
                    <ModalOverlay />
                    <ModalContent>
                      <ModalHeader>Select Existing Marker</ModalHeader>
                      <ModalCloseButton />
                      <ModalBody>
                        {isLoadingMarkers ? (
                          <Skeleton height="200px" />
                        ) : (
                          <SimpleGrid columns={3} gap={4}>
                            {existingMarkers.map(m => (
                              <Box
                                key={m.id}
                                border="1px solid"
                                borderColor="gray.200"
                                p={2}
                                borderRadius="md"
                                cursor="pointer"
                                onClick={() => handleSelectExisting(m)}
                                _hover={{ bg: 'gray.50' }}
                              >
                                <Image src={m.imageUrl} alt={m.name} boxSize="100px" objectFit="contain" mx="auto" />
                                <Text fontSize="xs" textAlign="center" mt={1} isTruncated>{m.name}</Text>
                              </Box>
                            ))}
                          </SimpleGrid>
                        )}
                      </ModalBody>
                      <ModalFooter>
                        <Button colorScheme="blue" mr={3} onClick={onClose}>
                          Close
                        </Button>
                      </ModalFooter>
                    </ModalContent>
                  </Modal>

                  {sceneCore.scene?.markers && sceneCore.scene.markers.length > 0 && (
                    <Table size="sm" variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Thumbnail</Th>
                          <Th>Name</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {sceneCore.scene.markers.map((marker) => (
                          <Tr key={marker.id}>
                            <Td>
                              <Image src={marker.imageUrl} alt={marker.name} boxSize="50px" objectFit="contain" />
                            </Td>
                            <Td>{marker.name}</Td>
                            <Td>
                              <Flex gap="0.5em">
                                <IconButton
                                  aria-label="Download Marker"
                                  icon={<DownloadIcon />}
                                  size="sm"
                                  onClick={() => window.open(marker.imageUrl, '_blank')}
                                />
                                <IconButton
                                  aria-label="Delete Marker"
                                  icon={<DeleteIcon />}
                                  colorScheme="red"
                                  size="sm"
                                  onClick={() => sceneCore.deleteMarker(marker.id)}
                                />
                              </Flex>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        <Box width="50%" alignSelf="center">
          {/* We use UnityViewer, but its internal ToolbarProvider needs to be removed so we share the same context */}
          <UnityViewer
            style={{ width: '100%' }}
            expName={expName}
            sceneName={sceneName}
          />
        </Box>
      </React.Suspense>
    </Box>
  );
}

export default function Scene() {
  return (
    <ToolbarProvider>
      <SceneContent />
    </ToolbarProvider>
  );
}

