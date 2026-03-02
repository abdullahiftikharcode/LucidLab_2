mergeInto(LibraryManager.library, {
  SendObjectSelected: function(ptr) {
    var objectName = UTF8ToString(ptr);
    var event = new CustomEvent('unityObjectSelected', { detail: objectName });
    window.dispatchEvent(event);
  }
});
