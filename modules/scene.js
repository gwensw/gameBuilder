/*jshint esversion:6, devel: true, browser: true*/

const Scene = (function () {
  
  "use strict";
  const self = {};
  let sceneData = {};
  let frameData = {};
  let prefix = false;
  
  //////////////////////
  // HELPER FUNCTIONS //
  //////////////////////
  
  //return frame
  const findFrame = function (frameId) {
    for (let i = 0, fl = sceneData.frames.length; i < fl; i += 1) {
      if (sceneData.frames[i].id === frameId) {
        return sceneData.frames[i];
        break;
      } 
    }
    console.error(`Frame with id ${frameId} could not be found.`);
    return frameData;
  };
  
  //return frame text (with prefix, if one is stored)   
  const getFrameText = function () {
    if (prefix) {
      let temptext = `${prefix}<br>${frameData.text}`;
      prefix = false;
      return temptext;
    } else {
      return frameData.text;
    }
  };
  
  //remove frame options permanently if their oneoff = true
  const removeOneoffs = function () {
    let i = frameData.options.length;
    while (i--) {
      if (frameData.options[i].oneoff) {
        frameData.options.splice(i, 1);
      }
    }
  };
  
  //return new 'next' value if all conditions are met; else return false
  const validateNextif = function (nextif) {
    let outcome;
    for (let i = 1, nl = nextif.length; i < nl; i += 1) {
      switch (nextif[i][0]) {
        case "hasItem":
          outcome = Inventory.contains(nextif[i][1]);
          break;
        case "canAfford":
          outcome = Wallet.canAfford(nextif[i][1]);
          break;
      }
    }
    if (outcome) {
      return nextif[0];
    } else {
      return false;
    }
  }
  
  //////////////////////
  /// PUBLIC METHODS ///
  //////////////////////

  self.processOption = function (optionId) {
    const option = frameData.options[optionId]; //ultimately references part of sceneData
    let next = option.next; //a string, so, not a reference. Can be temporarily modified.
      
    //[optional] add item to inventory
    if (option.getItem !== undefined) {
      Inventory.add(option.getItem);
    }

    //[optional] get/lose money
    if (option.money !== undefined) {
      Wallet.changeBy(option.money);
    }

    //[optional] change the future 'next' of the selected option
    if (option.next2 !== undefined) {
      option.next = option.next2;
      delete option.next2;
    }

    //[optional] store a prefix for using on the next text
    if (option.prefix !== undefined) {
      prefix = option.prefix;
    }

    //[optional] move game time onward
    if (option.time !== undefined) {
      Time.increment(option.time);
    }

    //[optional] if conditions are met, send player to a different 'next'
    if (option.nextif !== undefined) {
      next = validateNextif(option.nextif) || next;
    }

    //[optional] remove option permanently if remove = true
    if (option.remove) {
      frameData.options.splice(optionId, 1);
    }

    removeOneoffs();
    this.proceedTo(next);
  };
  
  //sets frameData to current frame
  self.proceedTo = function (frameId) {
    
    frameData = findFrame(frameId);
 
    View.setFrameText(getFrameText());
    View.addOptions(frameData.options);

    //[optional] change the future text of the current frame
    if (frameData.text2 !== undefined) {
      frameData.text = frameData.text2;
      delete frameData.text2;
    }
    
    console.log(`Currently at: ${frameData.id}`);

  };

  self.init = function (scenePath) {
    const self = this;
    const request = new XMLHttpRequest();

    request.onload = function() {
      if (request.status == 200) {
        try {
          sceneData = JSON.parse(request.responseText).scene;
          const firstFrame = sceneData.first_frame;
          View.updateAll();
          self.proceedTo(firstFrame);
        } catch (SyntaxError) {
          console.error(`There's something wrong in the JSON syntax of this scene: ${scenePath} Try running it through JSONLint.com`);
        }
      } else {
        console.error(`Retrieved response, but status was not 200. Status text: ${request.statusText}`);
      }
    };

    request.onerror = function() {
      console.error("XMLHttpRequest failed, could not reach Scene.");
    };
    
    request.open("GET", scenePath, true);
    request.send();
    
  };
  
  return self;

})();