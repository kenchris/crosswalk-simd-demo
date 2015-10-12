'use strict';

class ActionToggleOverlay {

  constructor () {
    // Defer normal constructor behavior to created because we're only
    // allowed to take the prototype with us from the class.
    Polymer(ActionToggleOverlay.prototype);
  }

  get is () {
    return 'action-toggle-overlay';
  }

  get properties () {
    return {
      checked: { type: Boolean, value: false, observer: 'checkedChanged' },
      disabled: { type: Boolean, value: false, observer: 'disabledChanged' }
    };
  }
  
  created () {
  }
    
  disabledChanged (newValue, oldValue) {
    if (!this.disabled)
      return;
    this.checked = false;
  }
      
  tapAction (ev) {
    ev.stopPropagation();
    if (this.disabled)
      return;

   this.checked = !this.checked;
  }
      
  checkedChanged (newValue, oldValue) {
    if (this.checked)
      Polymer.dom(this.$.overlay).classList.add("checked");
    else
      Polymer.dom(this.$.overlay).classList.remove("checked");
    this.fire('change');
  }
}
 
new ActionToggleOverlay;