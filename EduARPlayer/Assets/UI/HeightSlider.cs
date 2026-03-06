using UnityEngine;
using UnityEngine.EventSystems;

namespace Assets.UI
{
    public class HeightSlider : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        public RectTransform background;
        public RectTransform handle;

        public float Value { get; private set; }
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
                float halfHeight = background.rect.height / 2;
                float localY = Mathf.Clamp(localPoint.y, -halfHeight, halfHeight);
                handle.anchoredPosition = new Vector2(_startPosition.x, localY);
                Value = localY / halfHeight;
            }
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            Value = 0f;
            if (handle != null) handle.anchoredPosition = _startPosition;
        }
    }
}
