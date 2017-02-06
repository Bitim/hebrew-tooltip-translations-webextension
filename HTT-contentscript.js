(function() {
  //globals
  var HTTtimeoutID;
  var HTTelem;
  var HTTcurX;
  var HTTcurY;
  var HTTtooltip;
  var HTTdefinitions = ""; //translation output
  var HTToptions;

  
  function xhr(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(data) {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        var data = xhr.responseText;
		
        callback(data);
      } else {
        callback(null);
      }
    }
  }
  // Note that any URL fetched here must be matched by a permission in
  // the manifest.json file!
  xhr.open('GET', url, true);
  xhr.send();
  };
  
  /**
   * Handles data sent via chrome.extension.sendRequest().
   * @param request Object Data sent in the request.
   * @param sender Object Origin of the request.
   * @param callback Function The method to call when the request completes.
   */
  function onRequest(request, callback) {
    if (request.action == 'xhr') {
      xhr(request.url, callback);
    } else if(request.action == 'localStorage_set') {
      localStorage[request.attribute] = JSON.stringify(request.value || null);
      
      callback();
    } else if(request.action == 'localStorage_get') {
      callback(JSON.parse(localStorage[request.attribute] || null) || null);
    }
  };
  
  
  //helper functions
  function appendChild(child,parent){return(parent.insertBefore(child,parent.lastChild.nextSibling));}

  function HTTshowToolTip() {
    if(HTTdefinitions.length) {
      var minX, minY, maxX, maxY, ttX, ttY;

      HTTtooltip.style.width = "auto";
      HTTtooltip.style.height = "auto";
      HTTtooltip.innerHTML = HTTdefinitions;
      HTTtooltip.firstChild.style.marginTop = "0";
      HTTtooltip.firstChild.style.marginRight = "0";
      HTTtooltip.firstChild.style.marginBottom = "0";
      HTTtooltip.firstChild.style.marginLeft = "0";
      ttX = HTTcurX;// + window.scrollX;
      ttY = HTTcurY;// + window.scrollY;
      if(HTToptions['align_left']) {
        ttX += 10;
      } else {
        ttX -= HTTtooltip.scrollWidth + 10;
      }
      if(HTToptions['align_top']) {
        ttY += 10;
      } else {
        ttY -= HTTtooltip.scrollHeight + 10;
      }
      minX = 0;//window.scrollX;
      minY = 0;//window.scrollY;
      maxX = minX + window.innerWidth - HTTtooltip.scrollWidth;
      maxY = minY + window.innerHeight - HTTtooltip.scrollHeight;
      if(HTToptions['keep_on_screen']) {
        if(ttX < minX)
          ttX = minX;
        else if(ttX > maxX)
          ttX = maxX;
        if(ttY < minY)
          ttY = minY;
        else if(ttY > maxY)
          ttY = maxY;
      }
      HTTtooltip.style.left = ttX + "px";
      HTTtooltip.style.top = ttY + "px";

      HTTtooltip.style.visibility="visible";
    }
  }

  function HTTparseResponse(responseText) {
    HTThide(true);
    if(responseText == null) return;  //quit if we didn't get anything

    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = responseText.replace(/<script(.|\s)*?\/script>/gi, '').replace(/src="[^"]*"/gi, '');

    var translations_e2h = tempDiv.getElementsByClassName('translate_box_en box');
    var results = new Array();
    var rtl = 0; //count how many of each type
    for(var i = 0; i < translations_e2h.length; i++) {
      if(translations_e2h[i].getElementsByClassName('word').length > 0 &&
         translations_e2h[i].getElementsByClassName('diber').length > 0 &&
         translations_e2h[i].getElementsByClassName('translation translation_he').length > 0) {
        var new_result = new Object;
        new_result['word'] = translations_e2h[i].getElementsByClassName('word')[0].textContent;
        new_result['partOfSpeech'] = translations_e2h[i].getElementsByClassName('diber')[0].textContent;
        new_result['definition'] = translations_e2h[i].getElementsByClassName('translation translation_he')[0].textContent;
        new_result['rtl'] = 0;
        rtl--;
        results.push(new_result);
      }
    }

    var translations_h2e = tempDiv.getElementsByClassName('translate_box');
    for(var i = 0; i < translations_h2e.length; i++) {
      if(translations_h2e[i].getElementsByClassName('word').length > 0 &&
         translations_h2e[i].getElementsByClassName('diber').length > 0 &&
         translations_h2e[i].getElementsByClassName('default_trans').length > 0) {
        var new_result = new Object;
        new_result['word'] = translations_h2e[i].getElementsByClassName('word')[0].textContent;
        new_result['partOfSpeech'] = translations_h2e[i].getElementsByClassName('diber')[0].textContent;
        new_result['definition'] = translations_h2e[i].getElementsByClassName('default_trans')[0].textContent;
        new_result['rtl'] = 1;
        rtl++;
        results.push(new_result);
      }
    }
    tempDiv = null;

    if(results.length > 0) {
      var rtl = (rtl > 0); //map to either 0 or 1
      HTTdefinitions = "";
      HTTdefinitions += "<table class='HTT " + (rtl?"HTTHebrew":"HTTEnglish") + "' dir=\"\"><tbody class='HTT " + (rtl?"HTTHebrew":"HTTEnglish") + "' dir=\"\">\n";
      for(var i = 0; i < results.length; i++) {
        HTTdefinitions += "<tr class='HTT'>";
        HTTdefinitions += "<td class='HTT HTTWord " + (results[i].rtl?"HTTHebrew":"HTTEnglish") + "'>" + results[i].word + "</td>\n";
        HTTdefinitions += "<td class='HTT HTTPartOfSpeech " + (results[i].rtl?"HTTHebrew":"HTTEnglish") + "'>" + results[i].partOfSpeech + "</td>\n";
        HTTdefinitions += "<td class='HTT HTTDefinition " + (!results[i].rtl?"HTTHebrew":"HTTEnglish") + "'>" + results[i].definition + "</td>";
        HTTdefinitions += "</tr>\n";
      }
      HTTdefinitions += "</tbody></table>";
      HTTshowToolTip();
    }
  }

  function HTTtranslateWord(input) {
    if(input != '') {
      if(HTToptions['activity_indicator']) {
        HTTtooltip.style.width = "auto";
        HTTtooltip.style.height = "auto";
        HTTtooltip.innerHTML = "<div class='HTT HTTActivityIndicator'></div>"
        ttX = HTTcurX;
        ttY = HTTcurY;
        if(HTToptions['align_left']) {
          ttX += 10;
        } else {
          ttX -= HTTtooltip.scrollWidth + 10;
        }
        if(HTToptions['align_top']) {
          ttY += 10;
        } else {
          ttY -= HTTtooltip.scrollHeight + 10;
        }
        minX = 0;
        minY = 0;
        maxX = minX + window.innerWidth - HTTtooltip.scrollWidth;
        maxY = minY + window.innerHeight - HTTtooltip.scrollHeight;
        if(HTToptions['keep_on_screen']) {
          if(ttX < minX)
            ttX = minX;
          else if(ttX > maxX)
            ttX = maxX;
          if(ttY < minY)
            ttY = minY;
          else if(ttY > maxY)
            ttY = maxY;
        }
        HTTtooltip.style.left = ttX + "px";
        HTTtooltip.style.top = ttY + "px";

        HTTtooltip.style.visibility="visible";
      }
      var HTTreq;
      onRequest({'action' : 'xhr', 'url' : 'http://www.morfix.co.il/' + encodeURIComponent(input)}, HTTparseResponse);
    }
  }

  function getStringOffsetFromPoint(elem, x, y) {
    try {
      if(elem.nodeType == elem.TEXT_NODE) {
        var range = elem.ownerDocument.createRange();
		
        range.selectNodeContents(elem);
        var str = range.toString();
        var currentPos = 0;
        var endPos = range.endOffset;
        //can't binary search because the rectangles are complicated, two-dimensional
        while(currentPos < endPos) {
          range.setStart(elem, currentPos);
          range.setEnd(elem, currentPos+1);
		  
		  var tmp = range.getBoundingClientRect();
		  
          if(range.getBoundingClientRect() &&
             range.getBoundingClientRect().left <= x && range.getBoundingClientRect().right  >= x &&
             range.getBoundingClientRect().top  <= y && range.getBoundingClientRect().bottom >= y) {
            range.detach();
            return({'string' : str, 'offset' : currentPos, 'text_node' : elem});
          }
          currentPos += 1;
        }
      } else {
        for(var i = 0; i < elem.childNodes.length; i++) {
          var range = elem.childNodes[i].ownerDocument.createRange();
          try {
            range.selectNodeContents(elem.childNodes[i]);
          } catch(err) {
            continue;
          }
          if(range.getBoundingClientRect() &&
             range.getBoundingClientRect().left <= x && range.getBoundingClientRect().right  >= x &&
             range.getBoundingClientRect().top  <= y && range.getBoundingClientRect().bottom >= y) {
            range.detach();
            var ret = getStringOffsetFromPoint(elem.childNodes[i], x, y);
            if(ret)
              return(ret);
          } else {
            range.detach();
          }
        }
      }
      return(null);
    } catch (e) {
      return(null);
    }
  }

  function HTTgetWord() {
    var text = "";
    var str_offset = getStringOffsetFromPoint(HTTelem, HTTcurX, HTTcurY);
    if(str_offset) {
      var range = window.getSelection();
      if(range && //there is a range
         range.toString != "" && //there is text selected
         range.anchorNode == range.focusNode && //it's just a single node
         str_offset.text_node == range.anchorNode && //it's the same node as the one under the cursor
         ((range.baseOffset < range.focusOffset && range.baseOffset <= str_offset.offset && str_offset.offset <= range.focusOffset) || //offset is inside the selected region
          (range.focusOffset < range.baseOffset && range.focusOffset <= str_offset.offset && str_offset.offset <= range.baseOffset))) {
        text = range.toString();
      } else {
        var str = str_offset.string;
        var start = str_offset.offset;
        var end = start + 1;
        var valid_word = /^((\w)+|([\u0590-\u05ff\"\']+))$/;
        if(!valid_word.test(str.substring(start, end)))
          return null;
        while(start > 0 && valid_word.test(str.substring(start - 1, end)))
          start--;
        while(end < str.length && valid_word.test(str.substring(start, end+1)))
          end++;
        text = str.substring(start, end);
      }
    }
    HTTtranslateWord(text);
  }

  function HTThide(force) {
    if(HTTtimeoutID || force) {
      HTTdefinitions = "";
      HTTtooltip.style.visibility = "hidden";
      HTTtooltip.textContent = HTTdefinitions;
      HTTtooltip.style.left = 0 + "px";
      HTTtooltip.style.top = 0 + "px";
      HTTtooltip.style.width = 0 + "px";
      HTTtooltip.style.height = 0 + "px";
      window.clearTimeout(HTTtimeoutID);
      HTTtimeoutID = 0;
    }
  }

  function HTTmousescroll(event) {
    var e = event;

    //variables for use in displaying the translation
    HTTelem = e.target;
    HTTcurX = e.clientX;
    HTTcurY = e.clientY;

    //GM_log("got click");
    if(HTToptions['hide_scroll'])
      HTThide(true); //hide the old one if there is one
    if(HTToptions['trigger_hover'])
      HTTtimeoutID = window.setTimeout(HTTgetWord, HTToptions['HTTtooltipDelay']);
    return;
  }

  function HTTkeypress(event) {
    var e = event;
    
    //GM_log("got keypress");
    if(HTToptions['hide_keyboard'])
      HTThide(true); //hide the old one if there is one

    var keynum;
    var keychar;
    var numcheck;
    var text;

    if(window.event) // IE
      keynum = e.keyCode;
    else if(e.which) // Netscape/Firefox/Opera
      keynum = e.which;

    keychar = String.fromCharCode(keynum);
    //GM_log("keychar is " + keychar);
    if(HTToptions['trigger_keyboard'] &&
       (HTToptions['HTTtooltipCharacter'] == '' || HTToptions['HTTtooltipCharacter'].indexOf(keychar) >= 0) &&
       (HTToptions['trigger_keyboard_ctrl'] == e.ctrlKey) &&
       (HTToptions['trigger_keyboard_alt'] == e.altKey) &&
       (HTToptions['trigger_keyboard_shift'] == e.shiftKey)) {
      //GM_log("match");
      if(window.getSelection() != '') {
        //GM_log("translating phrase " + window.getSelection());
        HTTtranslateWord(window.getSelection());
      } else {
        HTTgetWord(); //get the word under the cursor right now and translate it
      }
    }
    return;
  }

  function HTTmouseup(event) {
    var e = event;
    
    HTTcurX=e.clientX;
    HTTcurY=e.clientY;
    //GM_log("got mouseup " + window.getSelection());
    //HTThide(true); //hide the old one if there is one

    //variables for use in displaying the translation
    //GM_log("try to translate " + window.getSelection());
    if(window.getSelection() != '' &&
       HTToptions['trigger_highlight'] &&
       (HTToptions['trigger_highlight_ctrl'] == e.ctrlKey) &&
       (HTToptions['trigger_highlight_alt'] == e.altKey) &&
       (HTToptions['trigger_highlight_shift'] == e.shiftKey))
      HTTtranslateWord(window.getSelection());
    return;
  }

  function HTTclick(event) {
    var e = event;

    //click is used by many handlers, mostly to hide the tooltip
    //variables for use in displaying the translation
    HTTelem = e.target;
    HTTcurX = e.clientX;
    HTTcurY = e.clientY;

    //GM_log("got click");
    if(HTToptions['hide_click'])
      HTThide(true); //hide the old one if there is one
    if(HTToptions['trigger_click'] &&
       (HTToptions['trigger_click_ctrl'] == e.ctrlKey) &&
       (HTToptions['trigger_click_alt'] == e.altKey) &&
       (HTToptions['trigger_click_shift'] == e.shiftKey))
      HTTgetWord(); //get the word under the cursor right now
    return;
  }

  function HTTmousemove(event) {
    var e = event;

    if(HTTelem == e.target && HTTcurX == e.clientX && HTTcurY == e.clientY)
      return; //already got this mousemove so ignore it
      
    //variables for use in finding the word and displaying the translation
    HTTelem = e.target;
    HTTcurX = e.clientX;
    HTTcurY = e.clientY;

    if(HTToptions['hide_move'])
      HTThide(true);
    if(HTToptions['trigger_hover'])
      HTTtimeoutID = window.setTimeout(HTTgetWord, HTToptions['HTTtooltipDelay']);
    return;
  }

  function HTTinit() {
    onRequest({'action' : 'localStorage_get', 'attribute' : 'options'}, HTToptions_callback);
    //don't continue until the callback completes
  }

  function HTToptions_callback(options) {
    //below copied from HTT-options.html
    if (!options) {
      options = {};
    }
    if(options['trigger_hover'] == undefined) options['trigger_hover'] = 1;
    if(options['HTTtooltipDelay'] == undefined) options['HTTtooltipDelay'] = 1000;

    if(options['trigger_click'] == undefined) options['trigger_click'] = 0;
    if(options['trigger_click_ctrl'] == undefined) options['trigger_click_ctrl'] = 0;
    if(options['trigger_click_alt'] == undefined) options['trigger_click_alt'] = 0;
    if(options['trigger_click_shift'] == undefined) options['trigger_click_shift'] = 0;
    
    if(options['trigger_highlight'] == undefined) options['trigger_highlight'] = 0;
    if(options['trigger_highlight_ctrl'] == undefined) options['trigger_highlight_ctrl'] = 0;
    if(options['trigger_highlight_alt'] == undefined) options['trigger_highlight_alt'] = 0;
    if(options['trigger_highlight_shift'] == undefined) options['trigger_highlight_shift'] = 0;

    if(options['trigger_keyboard'] == undefined) options['trigger_keyboard'] = 0;
    if(options['trigger_keyboard_ctrl'] == undefined) options['trigger_keyboard_ctrl'] = 0;
    if(options['trigger_keyboard_alt'] == undefined) options['trigger_keyboard_alt'] = 0;
    if(options['trigger_keyboard_shift'] == undefined) options['trigger_keyboard_shift'] = 0;
    if(options['HTTtooltipCharacter'] == undefined) options['HTTtooltipCharacter'] = 'T';

    if(options['hide_move'] == undefined) options['hide_move'] = 1;
    if(options['hide_click'] == undefined) options['hide_click'] = 1;
    if(options['hide_scroll'] == undefined) options['hide_scroll'] = 1;
    if(options['hide_keyboard'] == undefined) options['hide_keyboard'] = 1;

    if(options['align_top'] == undefined) options['align_top'] = 1;
    if(options['align_left'] == undefined) options['align_left'] = 1;
    if(options['keep_on_screen'] == undefined) options['keep_on_screen'] = 1;
    
    if(options['activity_indicator'] == undefined) options['activity_indicator'] = 1;
    
    HTToptions = options;

    if(HTToptions['trigger_hover'] || HTToptions['hide_move']) {
      window.addEventListener("mousemove", HTTmousemove, false);
    }
    if(HTToptions['trigger_click'] || HTToptions['hide_click']) {
      window.addEventListener("click", HTTclick, false);
    }
    if(HTToptions['trigger_highlight']) {
      window.addEventListener("mouseup", HTTmouseup, false);
    }
    if(HTToptions['trigger_keyboard'] || HTToptions['hide_keyboard']) {
      window.addEventListener("keypress", HTTkeypress, false);
    }
    if(HTToptions['trigger_keyboard'] || HTToptions['hide_keyboard']) {
      window.addEventListener("keydown", HTTkeypress, false);
    }
    if(HTToptions['hide_scroll']) {
      window.addEventListener("scroll", HTTmousescroll, false);
    }
    HTTtooltip = document.createElement("div");
    HTTtooltip.className = "HTT HTTtooltip"; //for use by users that might do things with stylish
    document.body.insertBefore(HTTtooltip, document.body.firstChild);
  }
  HTTinit();
})();