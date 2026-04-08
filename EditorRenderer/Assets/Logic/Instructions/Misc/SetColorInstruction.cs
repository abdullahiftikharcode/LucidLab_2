using System;
using System.Collections.Generic;
using Assets.Logic.Misc;
using Assets.PlayMode;
using UnityEngine;

namespace Assets.Logic.Instructions.Misc
{
    public class SetColorInstruction : ExecInstruction
    {
        public override object GetOutput(string outputName) => throw new System.NotImplementedException();

        protected override void ExecuteImpl()
        {
            // Object name may come either from controls["object"] (direct) or from an input value
            // called "object" (e.g. when the node uses an input control). Support both.
            string objName = null;
            if (controls != null && controls.TryGetValue("object", out var directObj) && !string.IsNullOrEmpty(directObj))
            {
                objName = directObj;
            }
            else if (inputs != null && inputs.TryGetValue("object", out var objInput))
            {
                var val = objInput.GetValue();
                if (val != null)
                    objName = Convert.ToString(val);
            }

            if (string.IsNullOrEmpty(objName))
            {
                Debug.LogWarning("[SetColorInstruction] Missing or empty object name (controls.object / inputs['object'])");
                return;
            }

            // Color is always expected in controls.color (we normalize this on the AI side)
            if (controls == null || !controls.TryGetValue("color", out var color) || string.IsNullOrEmpty(color))
            {
                Debug.LogWarning($"[SetColorInstruction] Missing or empty controls.color for object '{objName}'");
                return;
            }

            Debug.Log($"[SetColorInstruction] Requesting color change: object='{objName}', color='{color}'");

            var obj = GetContext().GetObject(objName);
            if (obj == null)
            {
                Debug.LogWarning($"[SetColorInstruction] GetObject('{objName}') returned null");
                return;
            }

            obj.UpdateColor(color);
        }

        public SetColorInstruction(Dictionary<string, InputParam> inputs, Dictionary<string, string> parms,
            Dictionary<string, ExecInstruction> nxtInstructions) : base(inputs, parms, nxtInstructions) { }
    }
}
