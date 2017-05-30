'use babel';

import Provider from './provider';
/* global atom */

export default {

  activate(state) {
    console.log("activating !!");
    console.log(state);

    this._provider = new Provider();
    // atom.commands.add('atom-workspace', {
    //   'my-package:reload': () => this.reload()
    // });
    atom.workspace.observeTextEditors(editor => {
      editor.onDidSave(() => {
        console.log("save happen");
        this.reload();
      });
    });
  },

  deactivate() {
    console.log("deactivating !!");
  },

  getProvider() {
    return this._provider;
  },

  reload() {
    let file = atom.workspace.getActiveTextEditor().buffer.file;
    if(file.path.endsWith('.feature')) {
      this._provider.reloadSuggestions();
    }
    console.log("Reloading!!");
  }


};
