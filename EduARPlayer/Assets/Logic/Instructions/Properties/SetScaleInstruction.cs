using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Assets.Logic.Misc;
using Assets.SceneManagement;
using UnityEngine;

namespace Assets.Logic.Instructions.Properties {
    class SetScaleInstruction : ExecInstruction {
        protected override void ExecuteImpl() {
            var objName = controls.GetValueOrDefault("object");
            if (string.IsNullOrEmpty(objName)) return;
            var obj = GetSceneManager().currentScene?.GetObject(objName);
            if (obj == null) return;
            var xVal = inputs.GetValueOrDefault("x")?.GetValue();
            var yVal = inputs.GetValueOrDefault("y")?.GetValue();
            var zVal = inputs.GetValueOrDefault("z")?.GetValue();
            if (xVal == null || yVal == null || zVal == null) return;
            var x = Convert.ToSingle(xVal);
            var y = Convert.ToSingle(yVal);
            var z = Convert.ToSingle(zVal);
            obj.UpdateScale(new List<float>() {x, y, z});
        }

        public override object GetOutput(string outputName) {
            throw new NotImplementedException();
        }

        public SetScaleInstruction(Dictionary<string, InputParam> inputs, Dictionary<string, string> parms,
            Dictionary<string, ExecInstruction> nxtInstructions) : base(inputs, parms, nxtInstructions) { }
    }
}
