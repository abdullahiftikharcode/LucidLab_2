using System.Collections.Generic;
using Assets.Logic.Instructions;

namespace Assets.SceneManagement.Core {
    public class Scene {
        public List<Object> sceneObjects;
        public Models.SceneData sceneData;
        public DataInstruction[] Instructions;
        public string Description;

        public Object GetObject(string name) {
            return sceneObjects.Find(x => x.Name == name);
        }

        public void Destroy() {
            foreach (var obj in sceneObjects) {
                obj.Destroy();
            }
        }
    }
}
