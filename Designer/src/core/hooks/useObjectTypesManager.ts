import { useContext, useEffect, useState } from 'react';
import { EduXRContext } from '../../app';
import { supabase } from '../../supabaseClient';

export type ObjectType = {
  name: string;
  objFile: string;
  mtlFile?: string;
};

export type ObjectTypesManager = {
  objects: ObjectType[];
  uploadObject: (objName: string, objFile: Blob) => Promise<boolean>;
};

export function useObjectTypesManager(): ObjectTypesManager {
  const { username } = useContext(EduXRContext);
  const [objects, setObjects] = useState<ObjectType[]>([]);

  async function getObjects() {
    const { data, error } = await supabase.storage
      .from('object-types')
      .list(username + '/');

    if (error) {
      console.error('Error fetching objects from Supabase:', error);
      return {};
    }

    const ret = {} as Record<string, ObjectType>;

    for (const item of data) {
      const name = item.name.split('.')[0];
      const ext = item.name.split('.')[1];
      if (ext !== 'glb') continue;

      const { data: urlData } = supabase.storage
        .from('object-types')
        .getPublicUrl(`${username}/${item.name}`);

      ret[name] = {
        name: name,
        objFile: urlData.publicUrl,
      } as ObjectType;
    }

    return ret;
  }

  function updateObjectsList() {
    getObjects().then((objects) => {
      let objsArr = [];
      for (const key in objects) {
        objsArr.push(objects[key]);
      }
      setObjects(objsArr);
    });
  }

  useEffect(() => {
    updateObjectsList();
  }, []);

  async function uploadObject(objName: string, objFile: Blob) {
    const filePath = `${username}/${objName}.glb`;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('object-types')
      .upload(filePath, objFile, {
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading to Supabase:', uploadError);
      return false;
    }

    updateObjectsList();
    return true;
  }

  return {
    objects,
    uploadObject,
  };
}
