import { Flex, Input, Text } from '@chakra-ui/react';

type Vector3InputProps = {
  value: [number, number, number];
  onChange: (value: [number, number, number]) => void;
};

export default function Vector3Input({ value, onChange }: Vector3InputProps) {
  const handleChange = (index: number, val: string) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) return;
    const newValue = [...value] as [number, number, number];
    newValue[index] = parsed;
    onChange(newValue);
  };

  return (
    <Flex gap="0.5em" width="20em">
      <Flex gap="0.2em">
        <Text alignSelf="center">X: </Text>
        <Input
          type="number"
          value={value[0]}
          onChange={e => handleChange(0, e.target.value)}
        />
      </Flex>
      <Flex gap="0.2em">
        <Text alignSelf="center">Y: </Text>
        <Input
          type="number"
          value={value[1]}
          onChange={e => handleChange(1, e.target.value)}
        />
      </Flex>
      <Flex gap="0.2em">
        <Text alignSelf="center">Z: </Text>
        <Input
          type="number"
          value={value[2]}
          onChange={e => handleChange(2, e.target.value)}
        />
      </Flex>
    </Flex>
  );
}
