'use babel';
/* global atom*/

import _ from 'lodash';
import InstructionsLoader from './instructions-loader';
import {
  parseInstructionFromLine,
  parseVerbFromLine
} from './parser-util';

class Provider {

  constructor() {
    this.selector =  '.source.feature, .feature';
    this._instructionsLoader = new InstructionsLoader();
    this.getSuggestions = this.getSuggestions.bind(this);
  }

  generateSuggestions(instructions, instructionText) {

    let replacementPrefix = instructionText;
    if(!replacementPrefix.startsWith(' ')) {
      replacementPrefix = ' ' + replacementPrefix;
    }

    return instructions.map(instruction => {
      return {
        text: ' ' + instruction,
        replacementPrefix
      };
    });
  }


  /**
   * Get the instruction text, everything after the cucumber verb (Then, And,
   * When, Given, etc.)
   */
  getInstructionText(editor, bufferPos) {
    let lineText = editor.getTextInRange([[bufferPos.row, 0], bufferPos]);
    return parseInstructionFromLine(lineText);
  }


  /**
   * Get the verb for an instruction for the current line in the editor (Then,
   * And, When, Given, etc.)
   */
  getInstructionVerb(editor, bufferPos) {
    let lineText = editor.lineTextForBufferRow(bufferPos.row);
    let verb = parseVerbFromLine(lineText);

    // if verb is And - get verb from previous line
    if(verb === 'And' && bufferPos.row !== 0) {
      return this.getInstructionVerb(editor, {
        column: bufferPos.column,
        row: bufferPos.row - 1
      });
    }

    return verb;
  }

  async getSuggestions(args) {
    const { editor, bufferPosition } = args;
    const instructionText = this.getInstructionText(editor, bufferPosition);
    const verb = this.getInstructionVerb(editor, bufferPosition);

    // find instructions for this project
    let instructions = await this._instructionsLoader.getInstructions();
    let projectFolder = _.find(atom.workspace.project.rootDirectories, dir => {
      return editor.getPath().startsWith(dir.getPath());
    });
    instructions = instructions[projectFolder.getPath()][verb];

    if(instructionText.trim() === '') {
      return this.generateSuggestions(instructions, instructionText);
    }

    // filter based on words in instruction
    for(let word of instructionText.split(' ')) {
      instructions = instructions.filter(instruction => {
        return _.includes(instruction.toLowerCase(), word.toLowerCase());
      });
    }
    return this.generateSuggestions(instructions, instructionText);
  }


  async reloadSuggestions() {
    console.log("reloading suggestions!!");
    await this._instructionsLoader.reloadInstructions();
  }
}

export default Provider;
