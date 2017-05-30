'use babel';

import _ from 'lodash';
import { parseInstructionFromLine } from './parser-util';

/* global atom */

class InstructionsLoader {

  constructor() {
    this.findFeatureFiles = this.findFeatureFiles.bind(this);
    this.getEntriesForDirectory = this.getEntriesForDirectory.bind(this);
  }


  /**
   * parse file system for directories and find a list of .feature files
   */
  async findFeatureFiles(directory) {
    const entries = await this.getEntriesForDirectory(directory);

    // get a list of files & subdirectories in this directory
    let files = entries.filter(entry => !entry.isDirectory());
    let subDirs = entries.filter(entry => entry.isDirectory());

    // remove node_modules folders
    // TODO remove anything in a gitignore or npmignore (by config)
    subDirs = subDirs.filter(subDir => subDir.getBaseName() !== 'node_modules');

    // find all feature files and return
    let featureFiles = files.filter(file => file.path.endsWith('.feature'));
    let subFeatureFiles = await Promise.all(subDirs.map(this.findFeatureFiles));
    return _.flatten(featureFiles.concat(subFeatureFiles));
  }

  /**
   * Get a list of files or subdirectories for a given directory
   */
  async getEntriesForDirectory(directory) {
    return new Promise((resolve, reject) => {
      directory.getEntries((err, entries) => {
        if(err) {
          reject(err);
        }
        resolve(entries);
      });
    });
  }

  /**
   * Get a list of instructions for a file
   */
  async getInstructionsForFile(file) {
    let content = await file.read();
    let lines = content.split('\n').map(line => line.trim());

    // don't process duplicates
    lines = _.uniq(lines);

    // filter out comments, blank lines, tags and scenario definitions
    lines = lines
      .filter(line => line !== '')
      .filter(line => !line.startsWith('#'))
      .filter(line => !line.startsWith('Scenario'))
      .filter(line => !line.startsWith('Feature'))
      .filter(line => !line.startsWith('@'));

    // group instructions by verb
    let verbbedInstructions = {};
    lines.forEach((line, index, lines) => {
      let verb = line.split(' ')[0];

      // if it's an and verb - go back until found the last non and verb
      let prevLineIndex = index - 1;
      while(prevLineIndex >= 0 && verb.toLowerCase() === 'and') {
        verb = lines[prevLineIndex].split(' ')[0];
        prevLineIndex--;
      }

      // create an array for this verb
      if(!verbbedInstructions[verb]) {
        verbbedInstructions[verb] = [];
      }

      let instruction = parseInstructionFromLine(line);
      verbbedInstructions[verb].push(instruction);
    });

    return verbbedInstructions;
  }

  /**
   * Get the instructions for all feature files in the workspace
   */
  async getInstructions() {
    if(!this._instructions) {
      await this.loadInstructions();
    }
    return this._instructions;
  }


  /**
   * Load the list of instructions for all feature files in the workspace
   */
  async loadInstructions() {

    const featureFiles = {};
    for(let directory of atom.workspace.project.rootDirectories) {
      featureFiles[directory.path] = await this.findFeatureFiles(directory);
    }

    let instructions = {};
    for(let projectFolder of Object.keys(featureFiles)) {

      // get a list of instructions in each feature file for the project
      let fileInstructions = featureFiles[projectFolder].map(async file => {
        return await this.getInstructionsForFile(file);
      });
      fileInstructions = await Promise.all(fileInstructions);

      // group together unique instructions from each file
      let projectInstructions = fileInstructions.reduce((last, curr) => {
        return _.mergeWith(last, curr, (obj, src) => {
          return _.uniq((obj || []).concat((src || [])));
        });
      }, {});


      // sort the instructions alphabetically
      projectInstructions = _.mapValues(projectInstructions, value => {
        return value.sort((a, b) => {
          if(a.toLowerCase() < b.toLowerCase()) return -1;
          if(a.toLowerCase() > b.toLowerCase()) return 1;
          return 0;
        });
      });

      instructions[projectFolder] = projectInstructions;
    }
    this._instructions = instructions;
  }

  async reloadInstructions() {
    await this.loadInstructions();
  }

}

export default InstructionsLoader;
