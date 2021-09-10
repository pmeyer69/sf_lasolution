/*
dhtmlxScheduler v.4.2.0 Professional

This software is covered by DHTMLX Enterprise License. Usage without proper license is prohibited.

(c) Dinamenta, UAB.
*/
Scheduler.plugin(function(e){e.attachEvent("onTimelineCreated",function(t){"tree"==t.render&&(t.y_unit_original=t.y_unit,t.y_unit=e._getArrayToDisplay(t.y_unit_original),e.attachEvent("onOptionsLoadStart",function(){t.y_unit=e._getArrayToDisplay(t.y_unit_original)}),e.form_blocks[t.name]={render:function(e){var t="<div class='dhx_section_timeline' style='overflow: hidden; height: "+e.height+"px'></div>";return t},set_value:function(t,a,n,i){var r=e._getArrayForSelect(e.matrix[i.type].y_unit_original,i.type);
t.innerHTML="";var s=document.createElement("select");t.appendChild(s);var d=t.getElementsByTagName("select")[0];!d._dhx_onchange&&i.onchange&&(d.onchange=i.onchange,d._dhx_onchange=!0);for(var o=0;o<r.length;o++){var _=document.createElement("option");_.value=r[o].key,_.value==n[e.matrix[i.type].y_property]&&(_.selected=!0),_.innerHTML=r[o].label,d.appendChild(_)}},get_value:function(e){return e.firstChild.value},focus:function(){}})}),e.attachEvent("onBeforeSectionRender",function(t,a,n){var i={};
if("tree"==t){var r,s,d,o,_,l;a.children?(r=n.folder_dy||n.dy,n.folder_dy&&!n.section_autoheight&&(d="height:"+n.folder_dy+"px;"),s="dhx_row_folder",o="dhx_matrix_scell folder",_="<div class='dhx_scell_expand'>"+(a.open?"-":"+")+"</div>",l=n.folder_events_available?"dhx_data_table folder_events":"dhx_data_table folder"):(r=n.dy,s="dhx_row_item",o="dhx_matrix_scell item"+(e.templates[n.name+"_scaley_class"](a.key,a.label,a)?" "+e.templates[n.name+"_scaley_class"](a.key,a.label,a):""),_="",l="dhx_data_table");
var c="<div class='dhx_scell_level"+a.level+"'>"+_+"<div class='dhx_scell_name'>"+(e.templates[n.name+"_scale_label"](a.key,a.label,a)||a.label)+"</div></div>";i={height:r,style_height:d,tr_className:s,td_className:o,td_content:c,table_className:l}}return i});var t;e.attachEvent("onBeforeEventChanged",function(a,n,i){if(e._isRender("tree")){var r=e.getSection(a[e.matrix[e._mode].y_property]);if(r&&"undefined"!=typeof r.children&&!e.matrix[e._mode].folder_events_available)return i||(a[e.matrix[e._mode].y_property]=t),!1
}return!0}),e.attachEvent("onBeforeDrag",function(a,n,i){if(e._isRender("tree")){var r,s=e._locate_cell_timeline(i);if(s&&(r=e.matrix[e._mode].y_unit[s.y].key,"undefined"!=typeof e.matrix[e._mode].y_unit[s.y].children&&!e.matrix[e._mode].folder_events_available))return!1;var d=e.getEvent(a);t=r||d[e.matrix[e._mode].y_property]}return!0}),e._getArrayToDisplay=function(t){var a=[],n=function(t,i){for(var r=i||0,s=0;s<t.length;s++)t[s].level=r,"undefined"!=typeof t[s].children&&"undefined"==typeof t[s].key&&(t[s].key=e.uid()),a.push(t[s]),t[s].open&&t[s].children&&n(t[s].children,r+1)
};return n(t),a},e._getArrayForSelect=function(t,a){var n=[],i=function(t){for(var r=0;r<t.length;r++)e.matrix[a].folder_events_available?n.push(t[r]):"undefined"==typeof t[r].children&&n.push(t[r]),t[r].children&&i(t[r].children,a)};return i(t),n},e._toggleFolderDisplay=function(t,a,n){var i,r=function(e,t,a,n){for(var s=0;s<t.length&&(t[s].key!=e&&!n||!t[s].children||(t[s].open="undefined"!=typeof a?a:!t[s].open,i=!0,n||!i));s++)t[s].children&&r(e,t[s].children,a,n)},s=e.getSection(t);"undefined"!=typeof a||n||(a=!s.open),e.callEvent("onBeforeFolderToggle",[s,a,n])&&(r(t,e.matrix[e._mode].y_unit_original,a,n),e.matrix[e._mode].y_unit=e._getArrayToDisplay(e.matrix[e._mode].y_unit_original),e.callEvent("onOptionsLoad",[]),e.callEvent("onAfterFolderToggle",[s,a,n]))
},e.attachEvent("onCellClick",function(t,a){e._isRender("tree")&&(e.matrix[e._mode].folder_events_available||"undefined"!=typeof e.matrix[e._mode].y_unit[a]&&"undefined"!=typeof e.matrix[e._mode].y_unit[a].children&&e._toggleFolderDisplay(e.matrix[e._mode].y_unit[a].key))}),e.attachEvent("onYScaleClick",function(t,a){e._isRender("tree")&&"undefined"!=typeof a.children&&e._toggleFolderDisplay(a.key)}),e.getSection=function(t){if(e._isRender("tree")){var a,n=function(e,t){for(var i=0;i<t.length;i++)t[i].key==e&&(a=t[i]),t[i].children&&n(e,t[i].children)
};return n(t,e.matrix[e._mode].y_unit_original),a||null}},e.deleteSection=function(t){if(e._isRender("tree")){var a=!1,n=function(e,t){for(var i=0;i<t.length&&(t[i].key==e&&(t.splice(i,1),a=!0),!a);i++)t[i].children&&n(e,t[i].children)};return n(t,e.matrix[e._mode].y_unit_original),e.matrix[e._mode].y_unit=e._getArrayToDisplay(e.matrix[e._mode].y_unit_original),e.callEvent("onOptionsLoad",[]),a}},e.deleteAllSections=function(){e._isRender("tree")&&(e.matrix[e._mode].y_unit_original=[],e.matrix[e._mode].y_unit=e._getArrayToDisplay(e.matrix[e._mode].y_unit_original),e.callEvent("onOptionsLoad",[]))
},e.addSection=function(t,a){if(e._isRender("tree")){var n=!1,i=function(e,t,r){if(a)for(var s=0;s<r.length&&(r[s].key==t&&"undefined"!=typeof r[s].children&&(r[s].children.push(e),n=!0),!n);s++)r[s].children&&i(e,t,r[s].children);else r.push(e),n=!0};return i(t,a,e.matrix[e._mode].y_unit_original),e.matrix[e._mode].y_unit=e._getArrayToDisplay(e.matrix[e._mode].y_unit_original),e.callEvent("onOptionsLoad",[]),n}},e.openAllSections=function(){e._isRender("tree")&&e._toggleFolderDisplay(1,!0,!0)},e.closeAllSections=function(){e._isRender("tree")&&e._toggleFolderDisplay(1,!1,!0)
},e.openSection=function(t){e._isRender("tree")&&e._toggleFolderDisplay(t,!0)},e.closeSection=function(t){e._isRender("tree")&&e._toggleFolderDisplay(t,!1)}});
//# sourceMappingURL=../sources/ext/dhtmlxscheduler_treetimeline.js.map