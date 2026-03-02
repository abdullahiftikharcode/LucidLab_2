using System.Threading.Tasks;
using Assets.Logic;
using Assets.SceneManagement.Models;
using UnityEngine;
using Object = Assets.SceneManagement.Core.Object;

namespace Assets.SceneManagement.Builders {
    public class SceneBuilder : MonoBehaviour {
        public ObjectBuilder objectBuilder;

        public async Task<Core.Scene> CreateSceneFromData(SceneData sceneData) {
            var scene = new Core.Scene {
                sceneObjects = new System.Collections.Generic.List<Object>(),
                sceneData = sceneData,
                Description = sceneData.description
            };

            // Set the primary marker for this scene — objects without their own markerId anchor here
            objectBuilder.primaryMarkerId = (sceneData.markers != null && sceneData.markers.Count > 0)
                ? sceneData.markers[0].id
                : null;

            foreach (var obj in sceneData.objects) {
                scene.sceneObjects.Add(await objectBuilder.CreateObjectFromData(obj));
            }

            var logicBuilder = new LogicBuilder(sceneData.sceneLogic);
            scene.Instructions = logicBuilder.GetInstructions();

            return scene;
        }
    }
}
