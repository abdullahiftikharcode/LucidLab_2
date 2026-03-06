using UnityEngine;
using UnityEngine.EventSystems;

namespace Assets.UI
{
    public class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        public RectTransform background;
        public RectTransform handle;
        [Range(0f, 2f)] public float handleRange = 1f;

        public Vector2 Direction { get; private set; }
        private Vector2 _startPosition;

        void Start()
        {
            if (background == null) background = GetComponent<RectTransform>();
            if (handle == null && transform.childCount > 0) handle = transform.GetChild(0).GetComponent<RectTransform>();
            if (handle != null) _startPosition = handle.anchoredPosition;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            OnDrag(eventData);
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (background == null || handle == null) return;

            if (RectTransformUtility.ScreenPointToLocalPointInRectangle(background, eventData.position, eventData.pressEventCamera, out Vector2 localPoint))
            {
                float radius = background.rect.width / 2 * handleRange;
                Vector2 localDir = Vector2.ClampMagnitude(localPoint, radius);
                handle.anchoredPosition = _startPosition + localDir;
                Direction = localDir / radius;
            }
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            Direction = Vector2.zero;
            if (handle != null) handle.anchoredPosition = _startPosition;
        }
    }
}
