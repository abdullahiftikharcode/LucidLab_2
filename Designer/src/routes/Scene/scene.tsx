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
  VStack,
  HStack,
  Divider,
  Icon,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import { DeleteIcon, DownloadIcon, AddIcon, SettingsIcon, EditIcon, ChevronUpIcon, ChevronDownIcon } from '@chakra-ui/icons';
import * as React from 'react';
import { useContext, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useRete } from 'rete-react-render-plugin';
import { createEditor } from '../../components/logic_designer';
import { ExportedNodes } from '../../components/logic_designer/node_exporter';
import UnityViewer from '../../components/unity_viewer';
import { ToolbarProvider, useToolbar } from '../../components/unity_toolbar/useToolbarStore';
import useScene, { SceneObjectInterface } from '../../core/hooks/useScene';
import { SceneState } from '../../core/states/types';
import { ObjectTypesManagerContext } from '../experiment_root';
import SceneObjectInspector from './object_comp';

function Rete({
  sceneState,
  setSceneLogicInFirebase,
  logicImportVersion,
}: {
  sceneState: SceneState;
  setSceneLogicInFirebase: (nodes: ExportedNodes) => void;
  logicImportVersion: number;
}) {
  const [ref, editor] = useRete(createEditor);
  const isImportingRef = React.useRef(false);

  useEffect(() => {
    let asyncFunc = async () => {
      editor?.onSceneStateChange(nodes => {
        if (isImportingRef.current) return;
        setSceneLogicInFirebase(nodes);
      });
    };
    asyncFunc();
  }, [editor]);

  // Import logic when explicitly requested (initial load + AI apply),
  // not on every Firestore snapshot. This keeps the editor from constantly
  // resetting the view while still reflecting AI changes.
  useEffect(() => {
    if (!editor) return;
    const run = async () => {
      isImportingRef.current = true;
      try {
        await editor.importSceneState(sceneState.sceneLogic ?? {});
      } finally {
        isImportingRef.current = false;
      }
    };
    run();
  }, [editor, logicImportVersion]);
  return <Box ref={ref} style={{ width: '100%', height: '100%' }} bg="gray.900"></Box>;
}

function HierarchyItem({
  obj,
  isSelected,
  onSelect,
  onDoubleClick,
}: {
  obj: { objectName: string; objectType: string };
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
}) {
  return (
    <Flex
      align="center"
      p={2}
      cursor="pointer"
      bg={isSelected ? 'blue.600' : 'transparent'}
      _hover={{ bg: isSelected ? 'blue.500' : 'gray.700' }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      borderRadius="md"
      mb={1}
    >
      <Box mr={3}>
        {/* Simple icon based on type */}
        <Box w={2} h={2} borderRadius="full" bg={isSelected ? 'white' : 'gray.500'} />
      </Box>
      <VStack align="start" spacing={0}>
        <Text fontSize="sm" fontWeight={isSelected ? 'bold' : 'normal'} color="white">
          {obj.objectName}
        </Text>
        <Text fontSize="xs" color={isSelected ? 'gray.200' : 'gray.500'}>
          {obj.objectType}
        </Text>
      </VStack>
    </Flex>
  );
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

  // Layout: resizable sidebars and logic panel
  const [leftWidth, setLeftWidth] = useState(280);   // px
  const [rightWidth, setRightWidth] = useState(320); // px
  const [logicHeight, setLogicHeight] = useState(260); // px
  const [logicImportVersion, setLogicImportVersion] = useState(0);
  const initialLogicImportedRef = React.useRef(false);

  const createObject = function () {
    if (!newObjectName) return;
    sceneCore.addObject(newObjectName, selectedObjectType);
    setNewObjectName('');
  };

  const [isLogicOpen, setIsLogicOpen] = useState(false);
  const [activeRightTabKey, setActiveRightTabKey] = useState<'inspector' | 'settings' | 'ai'>('inspector');
  
  const [sceneDesc, setSceneDesc] = useState(sceneCore.scene?.description || '');
  const [markerName, setMarkerName] = useState('');
  const [markerFile, setMarkerFile] = useState<File | null>(null);

  // AI logic builder
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiIsLoading, setAiIsLoading] = useState(false);
  const [aiModel, setAiModel] = useState<string | null>(null);

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
    const fileInput = document.getElementById('markerFileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSelectExisting = (marker: any) => {
    const defaultMarkers = sceneCore.scene?.markers ?? [];
    if (defaultMarkers.some((m: any) => m.imageUrl === marker.imageUrl)) {
      onClose();
      return;
    }
    const newMarker = {
      id: `marker_${Date.now()}`,
      name: marker.name.split('.')[0] || marker.name,
      imageUrl: marker.imageUrl
    };
    sceneCore.addMarkerManual(newMarker);
    onClose();
  };

  // Trigger a single initial import of existing sceneLogic into the visual editor.
  React.useEffect(() => {
    if (initialLogicImportedRef.current) return;
    if (!sceneCore.scene?.sceneLogic) return;
    initialLogicImportedRef.current = true;
    setLogicImportVersion(v => v + 1);
  }, [sceneCore.scene?.sceneLogic]);

  // When an object is selected via toolbar (which calls setSelectedObject), we want to ensure the Right Sidebar shows Inspector
  useEffect(() => {
    if (selectedObjectName) {
      setActiveRightTabKey('inspector');
    }
  }, [selectedObjectName]);

  const selectedSceneObject = selectedObjectName ? sceneCore.getObject(selectedObjectName) : null;

  // Helpers for drag-to-resize (Windows-style edges)
  const startVerticalDrag = (e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;
    const minSidebar = 200;
    const maxSidebar = 600;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (side === 'left') {
        const next = Math.min(maxSidebar, Math.max(minSidebar, startLeft + dx));
        setLeftWidth(next);
      } else {
        const next = Math.min(maxSidebar, Math.max(minSidebar, startRight - dx));
        setRightWidth(next);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startHorizontalDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = logicHeight;
    const minHeight = 160;
    const maxHeight = 600;

    const onMove = (ev: MouseEvent) => {
      const dy = startY - ev.clientY; // drag up increases logic height
      const next = Math.min(maxHeight, Math.max(minHeight, startHeight + dy));
      setLogicHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <Flex h="100vh" w="100vw" bg="gray.900" color="gray.100" overflow="hidden">
      
      {/* LEFT SIDEBAR: HIERARCHY */}
      <Box 
        w={`${leftWidth}px`} 
        bg="gray.800" 
        borderRight="1px solid" 
        borderColor="gray.700" 
        display="flex" 
        flexDirection="column"
        zIndex={10}
      >
        <Box p={4} borderBottom="1px solid" borderColor="gray.700">
          <Heading size="sm" color="white" mb={4}>Hierarchy</Heading>
          
          <VStack spacing={3}>
            <FormControl>
              <Input
                size="sm"
                value={newObjectName}
                onChange={e => setNewObjectName(e.target.value)}
                placeholder="New Object Name"
                bg="gray.900"
                border="none"
                _focus={{ boxShadow: 'outline' }}
              />
            </FormControl>
            <HStack w="100%">
              <Select
                size="sm"
                value={selectedObjectType}
                onChange={e => setSelectedObjectType(e.target.value)}
                bg="gray.900"
                border="none"
              >
                <option value="cube">Cube</option>
                <option value="sphere">Sphere</option>
                <option value="capsule">Capsule</option>
                <option value="cylinder">Cylinder</option>
                {objectTypesManager.objects.map(type => (
                  <option key={type.name} value={type.name}>{type.name}</option>
                ))}
              </Select>
              <IconButton 
                aria-label="Add Object" 
                icon={<AddIcon />} 
                size="sm" 
                colorScheme="blue"
                onClick={createObject}
                isDisabled={!newObjectName}
              />
            </HStack>
          </VStack>
        </Box>

        <Box flex={1} overflowY="auto" p={2}>
          {sceneCore.objects?.map(obj => (
            <HierarchyItem
              key={obj.objectName}
              obj={obj}
              isSelected={selectedObjectName === obj.objectName}
              onSelect={() =>
                setSelectedObject(selectedObjectName === obj.objectName ? null : obj.objectName)
              }
              onDoubleClick={() => {
                // Notify Unity (via UnityViewer) to focus camera on this object
                window.dispatchEvent(
                  new CustomEvent('designerFocusObject', { detail: obj.objectName }),
                );
              }}
            />
          ))}
          {(!sceneCore.objects || sceneCore.objects.length === 0) && (
            <Text fontSize="sm" color="gray.500" textAlign="center" mt={4}>
              No objects in scene
            </Text>
          )}
        </Box>
      </Box>

      {/* Vertical divider between Hierarchy and Viewport */}
      <Box
        w="4px"
        cursor="col-resize"
        bg="transparent"
        _hover={{ bg: 'gray.600' }}
        onMouseDown={e => startVerticalDrag(e, 'left')}
      />

      {/* CENTER: VIEWPORT + LOGIC */}
      <Flex flex={1} flexDirection="column" position="relative" bg="black">
        {/* UNITY VIEWPORT */}
        <Box
          position="relative"
          overflow="hidden"
          h={isLogicOpen ? `calc(100% - ${logicHeight}px)` : '100%'}
        >
          <React.Suspense fallback={<Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center"><Skeleton height="100px" width="100px" /></Box>}>
            <UnityViewer
              style={{ width: '100%', height: '100%' }}
              expName={expName}
              sceneName={sceneName}
              sceneLogic={sceneCore.scene?.sceneLogic ?? undefined}
              objects={sceneCore.objects}
            />
          </React.Suspense>
          
          {/* LOGIC TOGGLE BUTTON */}
          <Tooltip label={isLogicOpen ? "Hide Logic Editor" : "Show Logic Editor"} placement="left">
            <Button
              position="absolute"
              bottom="20px"
              right="20px"
              colorScheme="purple"
              onClick={() => setIsLogicOpen(!isLogicOpen)}
              zIndex={100}
              leftIcon={isLogicOpen ? <ChevronDownIcon /> : <ChevronUpIcon />}
              shadow="lg"
            >
              Logic Graph
            </Button>
          </Tooltip>
        </Box>

        {/* LOGIC PANEL */}
        {isLogicOpen && (
          <Box 
            h={`${logicHeight}px`} 
            bg="gray.900" 
            borderTop="1px solid" 
            borderColor="gray.600" 
            position="relative"
            zIndex={50}
            boxShadow="0 -4px 20px rgba(0,0,0,0.5)"
          >
            {/* Horizontal resize handle */}
            <Box
              position="absolute"
              top={-4}
              left={0}
              right={0}
              h="6px"
              cursor="row-resize"
              bg="transparent"
              _hover={{ bg: 'gray.600' }}
              onMouseDown={startHorizontalDrag}
            />
            <Flex 
              h="32px" 
              bg="gray.800" 
              borderBottom="1px solid" 
              borderColor="gray.700" 
              align="center" 
              px={4} 
              justify="space-between"
              cursor="row-resize"
              onMouseDown={startHorizontalDrag}
            >
              <Text fontSize="xs" fontWeight="bold" color="gray.400" textTransform="uppercase">Visual Logic Editor</Text>
              <IconButton 
                aria-label="Close" 
                icon={<ChevronDownIcon />} 
                size="xs" 
                variant="ghost" 
                onClick={() => setIsLogicOpen(false)} 
              />
            </Flex>
            <Box h="calc(100% - 32px)" w="100%">
               <Rete
                 sceneState={sceneCore.scene}
                setSceneLogicInFirebase={sceneCore.setSceneLogic}
                logicImportVersion={logicImportVersion}
               />
            </Box>
          </Box>
        )}
      </Flex>

      {/* Vertical divider between Viewport and RIGHT SIDEBAR */}
      <Box
        w="4px"
        cursor="col-resize"
        bg="transparent"
        _hover={{ bg: 'gray.600' }}
        onMouseDown={e => startVerticalDrag(e, 'right')}
      />

      {/* RIGHT SIDEBAR: INSPECTOR / SETTINGS */}
      <Box 
        w={`${rightWidth}px`} 
        bg="gray.800" 
        borderLeft="1px solid" 
        borderColor="gray.700" 
        display="flex" 
        flexDirection="column"
        zIndex={10}
      >
        <Flex borderBottom="1px solid" borderColor="gray.700">
          <Button
            flex={1}
            variant="ghost"
            borderRadius={0}
            isActive={activeRightTabKey === 'inspector'}
            _active={{ bg: 'gray.700', borderBottom: '2px solid', borderColor: 'blue.400' }}
            onClick={() => setActiveRightTabKey('inspector')}
            py={6}
          >
            <VStack spacing={1}>
              <Icon as={EditIcon} />
              <Text fontSize="xs">Inspector</Text>
            </VStack>
          </Button>
          <Button
            flex={1}
            variant="ghost"
            borderRadius={0}
            isActive={activeRightTabKey === 'settings'}
            _active={{ bg: 'gray.700', borderBottom: '2px solid', borderColor: 'blue.400' }}
            onClick={() => setActiveRightTabKey('settings')}
            py={6}
          >
            <VStack spacing={1}>
              <Icon as={SettingsIcon} />
              <Text fontSize="xs">Settings</Text>
            </VStack>
          </Button>
          <Button
            flex={1}
            variant="ghost"
            borderRadius={0}
            isActive={activeRightTabKey === 'ai'}
            _active={{ bg: 'gray.700', borderBottom: '2px solid', borderColor: 'blue.400' }}
            onClick={() => setActiveRightTabKey('ai')}
            py={6}
          >
            <VStack spacing={1}>
              <Text fontSize="lg" lineHeight="1">AI</Text>
              <Text fontSize="xs">Logic</Text>
            </VStack>
          </Button>
        </Flex>

        <Box flex={1} overflowY="auto" p={0}>
          {activeRightTabKey === 'inspector' && (
            <Box p={4}>
              {selectedSceneObject ? (
                <SceneObjectInspector 
                  sceneObject={selectedSceneObject} 
                  markers={sceneCore.scene?.markers} 
                />
              ) : (
                <Flex direction="column" align="center" justify="center" h="200px" color="gray.500">
                  <Text>No object selected</Text>
                  <Text fontSize="sm">Select an object from the hierarchy or 3D view</Text>
                </Flex>
              )}
            </Box>
          )}

          {activeRightTabKey === 'settings' && (
            <VStack spacing={6} align="stretch" p={4}>
              <Box>
                <Heading size="xs" textTransform="uppercase" color="gray.500" mb={3}>Scene Description</Heading>
                <Textarea
                  value={sceneDesc}
                  onChange={e => {
                    setSceneDesc(e.target.value);
                    sceneCore.setDescription(e.target.value);
                  }}
                  bg="gray.900"
                  border="none"
                  fontSize="sm"
                  placeholder="Enter scene description..."
                  rows={4}
                />
              </Box>

              <Divider borderColor="gray.700" />

              <Box>
                <Heading size="xs" textTransform="uppercase" color="gray.500" mb={3}>AR Markers</Heading>
                <VStack spacing={3}>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400">Add Marker</FormLabel>
                    <Input
                      size="sm"
                      value={markerName}
                      onChange={e => setMarkerName(e.target.value)}
                      placeholder="Name"
                      bg="gray.900"
                      border="none"
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs" color="gray.400">Marker Image</FormLabel>
                    <Input
                      id="markerFileInput"
                      type="file"
                      size="sm"
                      onChange={e => setMarkerFile(e.target.files?.[0] || null)}
                      accept="image/*"
                      pt={1}
                      bg="gray.900"
                      border="none"
                    />
                  </FormControl>
                  <HStack w="100%">
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={handleMarkerUpload}
                      isDisabled={!markerName || !markerFile}
                      flex={1}
                    >
                      Upload
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchExistingMarkers}
                      flex={1}
                    >
                      Library
                    </Button>
                  </HStack>
                </VStack>

                <Box mt={4}>
                  {sceneCore.scene?.markers && sceneCore.scene.markers.length > 0 ? (
                    <Table size="sm" variant="simple" sx={{'th, td': { borderColor: 'gray.700' }}}>
                      <Thead>
                        <Tr>
                          <Th color="gray.400" p={2}>Img</Th>
                          <Th color="gray.400" p={2}>Name</Th>
                          <Th color="gray.400" p={2}></Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {sceneCore.scene.markers.map((marker) => (
                          <Tr key={marker.id}>
                            <Td p={2}>
                              <Image src={marker.imageUrl} alt={marker.name} boxSize="30px" objectFit="cover" borderRadius="sm" />
                            </Td>
                            <Td p={2} fontSize="xs" color="gray.300">{marker.name}</Td>
                            <Td p={2}>
                              <IconButton
                                aria-label="Delete"
                                icon={<DeleteIcon />}
                                colorScheme="red"
                                variant="ghost"
                                size="xs"
                                onClick={() => sceneCore.deleteMarker(marker.id)}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <Text fontSize="xs" color="gray.500" textAlign="center">No markers added</Text>
                  )}
                </Box>
              </Box>
            </VStack>
          )}

          {activeRightTabKey === 'ai' && (
            <VStack spacing={4} align="stretch" p={4}>
              <Box>
                <Heading size="xs" textTransform="uppercase" color="gray.500" mb={2}>
                  AI Logic Builder
                </Heading>
                <Text fontSize="sm" color="gray.400">
                  Describe the behavior you want. The AI will generate the same visual logic graph you can build manually.
                </Text>
              </Box>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                bg="gray.900"
                border="1px solid"
                borderColor="gray.700"
                fontSize="sm"
                placeholder={`Example:\nWhen scene starts, egg moves toward human. When egg touches human, egg disappears and human color changes.`}
                rows={8}
              />
              {aiError && (
                <Box p={3} border="1px solid" borderColor="red.500" borderRadius="md" bg="red.900/20">
                  <Text fontSize="sm" color="red.200">{aiError}</Text>
                </Box>
              )}
              {aiModel && (
                <Text fontSize="xs" color="gray.500">Model: {aiModel}</Text>
              )}
              <Button
                colorScheme="purple"
                isLoading={aiIsLoading}
                isDisabled={!aiPrompt.trim()}
                onClick={async () => {
                  setAiError(null);
                  setAiIsLoading(true);
                  try {
                    const resp = await fetch('/api/ai/scene-logic', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        prompt: aiPrompt,
                        // Provide current graph so the AI can modify/extend it.
                        currentSceneLogic: sceneCore.scene?.sceneLogic ?? null,
                        objects: (sceneCore.objects ?? []).map((o: any) => ({
                          objectName: o.objectName,
                          objectType: o.objectType,
                        })),
                      }),
                    });
                    const data = await resp.json().catch(() => null);
                    if (!resp.ok) {
                      setAiError(data?.error || `AI request failed (${resp.status})`);
                      return;
                    }
                    if (!data?.sceneLogic) {
                      setAiError('AI returned no scene logic.');
                      return;
                    }
                    setAiModel(data.model ?? null);
                    sceneCore.setSceneLogic(data.sceneLogic);
                    setIsLogicOpen(true);
                    setLogicImportVersion(v => v + 1);
                  } catch (e: any) {
                    setAiError(e?.message || 'AI request failed');
                  } finally {
                    setAiIsLoading(false);
                  }
                }}
              >
                Generate & Apply Logic
              </Button>
            </VStack>
          )}
        </Box>
      </Box>

      {/* MODAL FOR MARKERS */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
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
                    borderColor="gray.600"
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    onClick={() => handleSelectExisting(m)}
                    _hover={{ bg: 'gray.700' }}
                  >
                    <Image src={m.imageUrl} alt={m.name} boxSize="100px" objectFit="contain" mx="auto" />
                    <Text fontSize="xs" textAlign="center" mt={1} isTruncated color="gray.300">{m.name}</Text>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} colorScheme="whiteAlpha">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

export default function Scene() {
  return (
    <ToolbarProvider>
      <SceneContent />
    </ToolbarProvider>
  );
}
