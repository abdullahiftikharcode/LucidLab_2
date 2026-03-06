import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Select,
} from '@chakra-ui/react';
import * as React from 'react';
import { CompactPicker } from 'react-color';
import Vector3Input from '../../components/vector3_input';
import { SceneObjectInterface } from '../../core/hooks/useScene';
import { IsPrimitiveObject } from '../../core/misc';
import { SceneMarker } from '../../core/states/types';

type CompProps = {
  sceneObject: SceneObjectInterface;
  isSelected?: boolean;
  onSelect?: () => void;
  markers?: SceneMarker[];
};

export default function SceneObjectComp({ sceneObject, isSelected, onSelect, markers }: CompProps) {
  const [hasColor, setHasColor] = React.useState(false);

  React.useEffect(() => {
    setHasColor(IsPrimitiveObject(sceneObject.object!));
  }, [sceneObject]);

  return (
    <Card
      onClick={onSelect}
      cursor={onSelect ? 'pointer' : 'default'}
      border={isSelected ? '2px solid' : '1px solid transparent'}
      borderColor={isSelected ? 'blue.400' : 'transparent'}
      boxShadow={isSelected ? '0 0 10px rgba(66, 153, 225, 0.6)' : 'sm'}
      transition="border-color 0.2s, box-shadow 0.2s"
    >
      <CardBody>
        <Heading size="md" textAlign="center">
          {sceneObject.object?.objectName} ({sceneObject.object?.objectType})
        </Heading>
        <Flex direction="column" gap="1em" onClick={e => e.stopPropagation()}>
          <FormControl>
            <FormLabel>Position</FormLabel>
            <Vector3Input
              value={sceneObject.object?.position ?? [0, 0, 0]}
              onChange={sceneObject.setPosition}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Rotation</FormLabel>
            <Vector3Input
              value={sceneObject.object?.rotation ?? [0, 0, 0]}
              onChange={sceneObject.setRotation}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Scale</FormLabel>
            <Vector3Input
              value={sceneObject.object?.scale ?? [0, 0, 0]}
              onChange={sceneObject.setScale}
            />
          </FormControl>
          {hasColor && (
            <FormControl>
              <FormLabel>Color</FormLabel>
              <CompactPicker
                color={sceneObject.object?.color}
                onChange={e => {
                  console.log('[SceneObjectComp] CompactPicker onChange', {
                    objectName: sceneObject.object?.objectName,
                    hex: e.hex,
                  });
                  sceneObject.setColor(e.hex);
                }}
                onChangeComplete={e => {
                  console.log('[SceneObjectComp] CompactPicker onChangeComplete', {
                    objectName: sceneObject.object?.objectName,
                    hex: e.hex,
                  });
                }}
              />
            </FormControl>
          )}
          {(markers && markers.length > 0) && (
            <FormControl>
              <FormLabel>AR Marker Anchor</FormLabel>
              <Select
                value={sceneObject.object?.markerId || ''}
                onChange={(e) => sceneObject.setMarkerId(e.target.value)}
              >
                <option value="">None (Global App Anchor)</option>
                {markers.map((marker) => (
                  <option key={marker.id} value={marker.id}>
                    {marker.name}
                  </option>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl display="flex" gap="0.1em" flexDir="column">
            <FormLabel>Others</FormLabel>
            <Checkbox
              isChecked={sceneObject.object?.hasGravity}
              onChange={e => sceneObject.setHasGravity(e.target.checked)}
            >
              Has Gravity
            </Checkbox>
            <Checkbox
              isChecked={sceneObject.object?.isGrabbable}
              onChange={e => sceneObject.setGrabbable(e.target.checked)}
            >
              Is Grabable
            </Checkbox>
            <Checkbox
              isChecked={sceneObject.object?.showDesc}
              onChange={e => sceneObject.setShowDesc(e.target.checked)}
            >
              Show Description
            </Checkbox>
          </FormControl>
          <Button colorScheme="red" onClick={sceneObject.deleteSelf}>
            Delete
          </Button>
        </Flex>
      </CardBody>
    </Card>
  );
}
