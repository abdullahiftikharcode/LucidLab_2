using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Assets.Logic.Misc;
using Assets.SceneManagement;

namespace Assets.Logic.Instructions.Properties {
    class SetBouncinessInstruction : ExecInstruction {
        public SetBouncinessInstruction(Dictionary<string, InputParam> inputs, Dictionary<string, string> parms, Dictionary<string, ExecInstruction> nxtInstructions) : base(inputs, parms, nxtInstructions) { }
        public override object GetOutput(string outputName) {
            throw new NotImplementedException();
        }

        protected override void ExecuteImpl() {
            var objName = controls.GetValueOrDefault("object");
            if (string.IsNullOrEmpty(objName)) return;
            var obj = GetSceneManager().currentScene?.GetObject(objName);
            if (obj == null) return;
            var inputVal = inputs.GetValueOrDefault("value")?.GetValue();
            if (inputVal == null || (inputVal is string s && string.IsNullOrEmpty(s))) return;
            var val = Convert.ToSingle(inputVal);
            obj.UpdateBounciness(val);
        }
    }
}
