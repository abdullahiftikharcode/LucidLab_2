using UnityEngine;

namespace Assets.Scripts.Utils {
    public class UIOrderFixer : MonoBehaviour {
        public void FixOrder() {
            var canvas = GameObject.Find("Canvas");
            if (canvas == null) return;
            
            var bg = canvas.transform.Find("Background");
            if (bg != null) bg.SetAsFirstSibling();
            
            var header = canvas.transform.Find("Header");
            if (header != null) header.SetAsLastSibling();
        }

        void Start() {
            FixOrder();
        }
    }
}
