var map;
var defaultBasemap = 'Google Satellite';

var highlightControl;
var selectControl;
var bboxControl;
var toolTipQueue  = [];
var knownToolTips = [];
var knownGetCaps  = {};

var proj3857   = new OpenLayers.Projection("EPSG:3857");
var proj900913 = new OpenLayers.Projection("EPSG:900913");
var proj4326   = new OpenLayers.Projection("EPSG:4326");

function init() {
  var loadingMask = Ext.get('loading-mask');
  var loading = Ext.get('loading');

  //Hide loading message
  loading.fadeOut({duration : 0.2,remove : true});

  //Hide loading mask
  loadingMask.setOpacity(0.9);
  loadingMask.shift({
     xy       : loading.getXY()
    ,width    : loading.getWidth()
    ,height   : loading.getHeight()
    ,remove   : true
    ,duration : 1
    ,opacity  : 0.1
    ,easing   : 'bounceOut'
  });

  Ext.QuickTips.init();

  new Ext.Viewport({
     layout : 'border'
    ,id     : 'viewport'
    ,items  : [
      {
         region    : 'center'
        ,layout    : 'fit'
        // ,split     : true
        ,defaults  : {
           border     : false
          ,autoScroll : true
        }
        ,html      : '<div id="map"><div id="mapControlsResetMap"></div><div id="mapControlsChangeBackground"></div></div>'
        ,listeners : {
          afterrender : function(p) {
            initMap();
            p.addListener('bodyresize',function(p,w,h) {
              var el = document.getElementById('map');
              if (el) {
                el.style.width  = w;
                el.style.height = h;
                map.updateSize();
              }
            });
          }
        }
      }
      ,{
         region   : 'west'
        ,id       : 'searchResultsPanel'
        ,width    : 400
        ,minWidth : 200
        ,layout   : 'anchor'
        // ,split    : true
        ,defaults : {
          autoScroll : false
         ,border     : false
        }
        ,items    : [
          {height : 55,baseHeight : 55,id : 'searchPanel',bodyStyle : 'padding : 6px',items : [
            new Ext.ux.form.SearchField({
               emptyText       : 'Enter a search string (* is a wildcard).'
              ,width           : 386
              ,border          : false
              ,id              : 'anyTextSearchField'
              ,paramName       : 'anyText'
              ,onTrigger1Click : function() {
                if(this.hasSearch){
                    this.reset();
                    // having a tough time w/ the focus, so force a reset for emptyText
                    this.setRawValue(this.emptyText);
                    this.el.addClass(this.emptyClass);
                    var o = {start: 0};
                    if (this.store) {
                      this.store.baseParams = this.store.baseParams || {};
                      this.store.baseParams[this.paramName] = '';
                      this.store.reload({params:o});
                    }
                    this.triggers[0].hide();
                    this.hasSearch = false;
                }
              }
              ,onTrigger2Click : function() {
                var v = this.getRawValue();
                if(v.length < 1){
                    this.onTrigger1Click();
                    return;
                }
                var o = {start: 0};
                if (this.store) {
                  this.store.baseParams = this.store.baseParams || {};
                  this.store.baseParams[this.paramName] = v;
                  this.store.reload({params:o});
                }
                Ext.getCmp('queryGridPanel').getStore().load();
                this.hasSearch = true;
                this.triggers[0].show();
              }
            })
            ,{html : '&nbsp;',border : false,height : 4}
            ,new Ext.form.FieldSet({
               title          : '&nbsp;Advanced search options&nbsp;'
              ,collapsible    : true
              ,collapsed      : true
              ,labelWidth     : 230
              ,labelSeparator : ''
              ,items          : [
                new Ext.form.RadioGroup({
                   fieldLabel : 'Restrict results to custom boundaries?'
                  ,id         : 'searchBboxRadioGroup'
                  ,columns    : 1
                  ,items      : [
                     {boxLabel : 'Yes&nbsp;&nbsp;[<a href="javascript:drawBbox()">redraw</a>]',name : 'bboxRadioGroup',id : 'bboxRadioGroupYes'}
                    ,{boxLabel : 'No' ,name : 'bboxRadioGroup',id : 'bboxRadioGroupNo' ,checked : true}
                  ]
                  ,listeners  : {change : function(rg,radio) {
                    if (radio.id == 'bboxRadioGroupYes') {
                      if (!rg.alerted) {
                        Ext.Msg.alert('Custom boundaries','After closing this dialog, draw your custom bounding box on the map.  If you are not satisfied with your bounding box, click the redraw link to start over.  To completely clear your bounding box, select the "No" option.  This dialog will not appear again.');
                      }
                      rg.alerted = true;
                      drawBbox();
                    }
                    else {
                      bboxControl.layer.removeFeatures(bboxControl.layer.features);
                      bboxControl.deactivate();
                    }
                  }}
                })
                ,{border : false,cls : 'directions',height : 25,html : '<table><tr><td>Any option below that is left blank will be ignored.</td></tr></table>'}
                ,new Ext.form.DateField({
                   fieldLabel : 'Show results no older than this date:'
                  ,id         : 'searchStartDate'
                  ,width      : 100
                })
                ,new Ext.form.DateField({
                   fieldLabel : 'Show results no newer than this date:'
                  ,id         : 'searchEndDate'
                  ,width      : 100
                })
                ,new Ext.form.CheckboxGroup({
                   fieldLabel : 'Restrict results to these services:'
                  ,columns    : 1
                  ,items      : [
                     {boxLabel : 'OPeNDAP',id : 'serviceCheckboxOpendap'}
                    ,{boxLabel : 'SOS'    ,id : 'serviceCheckboxSos'}
                    ,{boxLabel : 'WMS'    ,id : 'serviceCheckboxWms'}
                  ]
                })
                ,{html : '<img src="img/blank.png" height=5>',border : false}
                ,{layout : 'column',border : false,defaults : {border : false},items : [
                   {columnWidth : 0.1,html : '<img src="img/blank.png" height=5>',border : false}
                   ,new Ext.Button({
                     columnWidth : 0.3
                    ,text        : 'Clear options'
                    ,handler     : function() {
                      resetAdvancedSearchOptions();
                    }
                  })
                  ,{columnWidth : 0.2,html : '<img src="img/blank.png" height=5>',border : false}
                  ,new Ext.Button({
                     columnWidth : 0.3
                    ,text        : 'Go!'
                    ,handler     : function() {
                      Ext.getCmp('queryGridPanel').getStore().load();
                    }
                  })
                  ,{columnWidth : 0.1,html : '<img src="img/blank.png" height=5>',border : false}
                ]}
              ]
              ,listeners   : {afterrender : function(p) {
                p.addListener('expand',function(p) {
                  var searchPanel = Ext.getCmp('searchPanel');
                  searchPanel.setHeight(searchPanel.baseHeight + p.getHeight() - 12);
                  searchPanel.doLayout();
                  var queryGridPanel = Ext.getCmp('queryGridPanel');
                  delete queryGridPanel.anchorSpec;
                  queryGridPanel.anchor = '100% -' + searchPanel.getHeight();
                  Ext.getCmp('searchResultsPanel').doLayout();
                });
                p.addListener('beforecollapse',function(p) {
                  if (!p.forceCollapse) {
                    Ext.MessageBox.confirm('Confirm','By hiding these options, any changes to the advanced search will be lost.  Are you sure you wish to continue?',function(button) {
                      if (button == 'yes') {
                        p.forceCollapse = true;
                        p.collapse();
                      }
                    });
                    return false;
                  }
                });
                p.addListener('collapse',function(p) {
                  resetAdvancedSearchOptions();
                  var searchPanel = Ext.getCmp('searchPanel');
                  searchPanel.setHeight(searchPanel.baseHeight);
                  searchPanel.doLayout();
                  var queryGridPanel = Ext.getCmp('queryGridPanel');
                  delete queryGridPanel.anchorSpec;
                  queryGridPanel.anchor = '100% -' + searchPanel.getHeight();
                  Ext.getCmp('searchResultsPanel').doLayout();
                });
              }}
            })
          ]}
          ,new Ext.grid.GridPanel({
             id               : 'queryGridPanel'
            ,anchor           : '100% -55'
            ,store            : new Ext.data.XmlStore({
              proxy       : new Ext.data.HttpProxy({
                 method : 'POST'
                ,url    : 'post.php?ns=gmi|srv|gmd|gco&url=' + encodeURIComponent('http://www.ngdc.noaa.gov/geoportal/csw')
              })
              ,record     : 'gmi_MI_Metadata'
              ,fields     : [
                 {name : 'title'          ,mapping : 'gmd_identificationInfo > gmd_MD_DataIdentification[id=DataIdentification] > gmd_citation > gmd_CI_Citation > gmd_title > gco_CharacterString'}
                ,{name : 'summary'        ,mapping : 'gmd_identificationInfo > gmd_MD_DataIdentification[id=DataIdentification] > gmd_abstract > gco_CharacterString'}
                ,{name : 'bboxWest'       ,mapping : 'gmd_identificationInfo > gmd_MD_DataIdentification[id=DataIdentification] > gmd_extent > gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_westBoundLongitude > gco_Decimal'}
                ,{name : 'bboxEast'       ,mapping : 'gmd_identificationInfo > gmd_MD_DataIdentification[id=DataIdentification] > gmd_extent > gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_eastBoundLongitude > gco_Decimal'}
                ,{name : 'bboxSouth'      ,mapping : 'gmd_identificationInfo > gmd_MD_DataIdentification[id=DataIdentification] > gmd_extent > gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_southBoundLatitude > gco_Decimal'}
                ,{name : 'bboxNorth'      ,mapping : 'gmd_identificationInfo > gmd_MD_DataIdentification[id=DataIdentification] > gmd_extent > gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_northBoundLatitude > gco_Decimal'}
                ,{name : 'services'       ,convert : (function(){
                  return function(v,n) {
                    return new Ext.data.XmlReader({
                       record : 'gmd_identificationInfo > srv_SV_ServiceIdentification'
                      ,fields : [
                         {name : 'type'     ,mapping : 'srv_serviceType > gco_LocalName'}
                        ,{name : 'url'      ,mapping : 'srv_containsOperations > srv_SV_OperationMetadata > srv_connectPoint > gmd_CI_OnlineResource > gmd_linkage > gmd_URL'}
                        ,{name : 'title'    ,mapping : 'gmd_citation > gmd_CI_Citation > gmd_title > gco_CharacterString'}
                        ,{name : 'summary'  ,mapping : 'gmd_abstract > gco_CharacterString'}
                        ,{name : 'extents'  ,convert : (function(){
                          return function(v,n) {
                            return new Ext.data.XmlReader({
                               record : 'srv_extent'
                              ,fields : [
                                 {name : 'bboxWest' ,mapping : 'gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_westBoundLongitude > gco_Decimal'}
                                ,{name : 'bboxEast' ,mapping : 'gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_eastBoundLongitude > gco_Decimal'}
                                ,{name : 'bboxSouth',mapping : 'gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_southBoundLatitude > gco_Decimal'}
                                ,{name : 'bboxNorth',mapping : 'gmd_EX_Extent > gmd_geographicElement > gmd_EX_GeographicBoundingBox > gmd_northBoundLatitude > gco_Decimal'}
                              ]
                            }).readRecords(n).records;
                          }
                        })()}
                        ,{name : 'keywords' ,convert : (function(){
                          return function(v,n) {
                            return new Ext.data.XmlReader({
                               record : 'srv_keywords > gmd_MD_Keywords > gmd_keyword'
                              ,fields : [
                                {name : 'keyword',mapping : 'gco_CharacterString'}
                              ]
                            }).readRecords(n).records;
                          }
                        })()}
                      ]
                    }).readRecords(n).records;
                  }
                })()}
              ]
              ,listeners  : {
                beforeload : function(sto) {
                  var lyr = map.getLayersByName('queryHits')[0];
                  if (lyr && lyr.features) {
                    lyr.removeFeatures(lyr.features);
                  }
                  for (var i = 0; i < knownToolTips.length; i++) {
                    knownToolTips[i].destroy();
                  }
                  knownToolTips = [];
                  Ext.getCmp('queryGridPanel').body.applyStyles({
                    'border-top' : '1px solid #99BBE8'
                  });
                  sto.setBaseParam('xmlData',buildFilter());
                }
                ,load      : function(sto) {
                  sto.each(function(rec) {
                    var services = rec.get('services');
                    if (!rec.get('title')) {
                      for (var i = 0; i < services.length; i++) {
                        if (services[i].data.title) {
                          rec.set('title',services[i].data.title);
                          rec.commit();
                        }
                      }
                    }
                    if (!rec.get('summary')) {
                      for (var i = 0; i < services.length; i++) {
                        if (services[i].data.summary) {
                          rec.set('summary',services[i].data.summary);
                          rec.commit();
                        }
                      }
                    }
                    if (!rec.get('bboxWest') && !rec.get('bboxEast') && !rec.get('bboxNorth') && !rec.get('bboxSouth')) {
                      var bounds = new OpenLayers.Bounds();
                      for (var i = 0; i < services.length; i++) {
                        var bbox = services[i].data.extents;
                        for (var j = 0; j < bbox.length; j++) {
                          bounds.extend(new OpenLayers.LonLat(services[i].data.extents[j].data.bboxWest,services[i].data.extents[j].data.bboxSouth));
                          bounds.extend(new OpenLayers.LonLat(services[i].data.extents[j].data.bboxEast,services[i].data.extents[j].data.bboxNorth));
                        }
                      }
                      var bounds = bounds.toBBOX().split(',');
                      rec.set('bboxWest',bounds[0]);
                      rec.set('bboxSouth',bounds[1]);
                      rec.set('bboxEast',bounds[2]);
                      rec.set('bboxNorth',bounds[3]);
                      rec.commit();
                    }
                  });

                  sto.sort('title','ASC');

                  var features = [];
                  sto.each(function(rec) {
                    var g = {
                       type        : 'Polygon'
                      ,coordinates : [[
                         [rec.get('bboxWest'),rec.get('bboxSouth')]
                        ,[rec.get('bboxEast'),rec.get('bboxSouth')]
                        ,[rec.get('bboxEast'),rec.get('bboxNorth')]
                        ,[rec.get('bboxWest'),rec.get('bboxNorth')]
                        ,[rec.get('bboxWest'),rec.get('bboxSouth')]
                      ]]
                    };
                    var geojson = new OpenLayers.Format.GeoJSON();
                    var f       = geojson.read({
                       type     : 'FeatureCollection'
                      ,features : [{
                         type       : 'Feature'
                        ,geometry   : g
                        ,properties : {
                           title   : rec.get('title')
                          ,summary : rec.get('summary')
                          ,id      : rec.id
                        }
                      }]
                    });
                    f[0].geometry.transform(proj4326,proj900913);
                    // change geometry from polygon to line
                    if (f[0].geometry.getArea() == 0) {
                      f[0].geometry = f[0].geometry.getVertices()[0];
                    }
                    else {
                      var vertices = f[0].geometry.getVertices();
                      vertices.push(vertices[0]);
                      f[0].geometry = new OpenLayers.Geometry.LineString(vertices);
                    }
                    features.push(f[0]);
                    
                    new Ext.ToolTip({
                       html   : 'Zoom to ' + rec.get('title')
                      ,target : rec.id + 'toolTip'
                    });
                    var children = [];
                    var services = rec.get('services');
                    for (var i = 0; i < services.length; i++) {
                      var keywords = [];
                      for (var j = 0; j < services[i].data.keywords.length; j++) {
                        if (services[i].data.keywords[j].data.keyword != '') {
                          keywords.push(services[i].data.keywords[j].data.keyword);
                        }
                      }
                      keywords.sort();
                      children.push({
                         text : services[i].data.type
                        ,url  : services[i].data.url
                        ,qtip : services[i].data.type + (keywords.length > 0 ? ' keywords: ' + keywords.join(', ') : '')
                        ,leaf : !new RegExp(/(service=(sos|wms))|dodsC/i).test(services[i].data.url)
                        ,gpId : rec.id
                      });
                    }
                    var tp = new Ext.tree.TreePanel({
                       renderTo    : rec.id
                      ,id          : rec.id + 'treePanel'
                      ,width       : Ext.getCmp('queryGridPanel').getWidth() - 35
                      ,border      : false
                      ,rootVisible : false
                      ,root        : new Ext.tree.AsyncTreeNode({children : [{
                         text      : 'Services'
                        ,children  : children
                        ,qtip      : 'Expand to view available data services'
                      }]})
                      ,bodyStyle   : 'background-color:transparent'
                      ,loader      : new Ext.tree.TreeLoader({
                        directFn : function(nodeId,callback) {
                          var node = tp.getNodeById(nodeId);
                          if (new RegExp(/service=sos/i).test(node.attributes.url)) {
                            sosGetCaps(node,callback);
                          }
                          else if (new RegExp(/service=wms/i).test(node.attributes.url)) {
                            wmsGetCaps(node,callback);
                          }
                          else if (new RegExp(/dodsC/i).test(node.attributes.url)) {
                            opendapGetCaps(node,callback);
                          }
                        }
                      })
                      ,listeners   : {
                        click : function(node,e) {
                          goQueryGridPanelRowById(node.attributes.gpId ? node.attributes.gpId : node.parentNode.attributes.gpId,false);
                          if (node.leaf) {
                            if (!findAndZoomToFeatureById(node.id)) {
                              if (new RegExp(/^http:\/\//).test(node.attributes.url)) {
                                Ext.Msg.alert('Unknown service',"We're sorry, but we don't know how to process this <a target=_blank href='" + node.attributes.url + "'>" + node.attributes.text + "</a> service.");
                              }
                              else {
                                Ext.Msg.alert('Unknown service',"We're sorry, but we don't know how to process this " + node.attributes.text + " service.");
                              }
                            }
                          }
                        }
                        ,beforeexpandnode : function(node) {
                          var n = {};
                          for (var i = 0; i < node.childNodes.length; i++) {
                            n[node.childNodes[i].id] = true;
                          }
                          var lyr = map.getLayersByName('queryHits')[0];
                          var f   = [];
                          for (var i = 0; i < lyr.features.length; i++) {
                            if (n[lyr.features[i].attributes.id]) {
                              lyr.features[i].attributes.hidden = false;
                              f.push(lyr.features[i]);
                            }
                          }
                          Ext.defer(function(){lyr.events.triggerEvent('featuresmodified',{features : f})},100);
                          lyr.redraw();
                        }
                      }
                    });
                  });
                  var lyr = map.getLayersByName('queryHits')[0];
                  lyr.addFeatures(features);
                  if (sto.getCount() < 0) {
                    Ext.getCmp('queryGridPanel').body.applyStyles({
                      'border-top' : 'none'
                    });
                  }
                  var countTxt = 'No records fetched.';
                  if (sto.getCount() == 1) {
                    countTxt = '1 record fetched.';
                  }
                  else if (sto.getCount() > 1) {
                    countTxt = sto.getCount() + ' records fetched.';
                  }
                  Ext.getCmp('searchResultsRecordsCounter').setText(countTxt);
                }
              }
              ,sortInfo  : {field : 'title',direction : 'ASC'}
            })
            ,columns          : [
              {renderer : function(val,metadata,rec) {
                return '<p id="' + rec.id + 'toolTip" class="title"><b><a href="javascript:var foo = findAndZoomToFeatureById(\'' + rec.id + '\')"><img style="margin-bottom:-1px" src="img/zoom.png">' + rec.get('title') + '</a></b></p>' + '<div id="' + rec.id + '"></div>';
              }}
            ]
            ,viewConfig       : {
               forceFit      : true
              ,enableRowBody : true
              ,getRowClass   : function(rec,idx,p,store) {
                p.body = [
                  '<p class="summary">' + rec.get('summary') + '</p>'
                ].join('');
                return 'x-grid3-row-expanded';
              }
              ,onRowOver     : function(e,target) {
                // sadly, this is not a listener
                var row = this.findRowIndex(target);
                if (row !== false) {
                  this.addRowClass(row,this.rowOverCls);
                  var lyr = map.getLayersByName('queryHits')[0];
                  var rec = this.grid.getStore().getAt(row);
                  for (var i = 0; i < lyr.features.length; i++) {
                    if (lyr.features[i].attributes.id == rec.id) {
                      highlightControl.highlight(lyr.features[i]);
                    }
                    else {
                      highlightControl.unhighlight(lyr.features[i]);
                    }
                  }
                }
              }
              ,listeners     : {refresh : function(view) {
                knownGetCaps = {};
                Ext.getCmp('queryGridPanel').getSelectionModel().clearSelections();
              }}
            }
            ,hideHeaders      : true
            ,loadMask         : true
            ,sm               : new Ext.grid.RowSelectionModel({
               singleSelect : true
              ,listeners    : {rowselect : function(sm,idx,rec) {
                findAndZoomToFeatureById(rec.id);
              }}
            })
            ,bbar       : {items : [
               '->'
              ,{
                 text : 'No records fetched.'
                ,id   : 'searchResultsRecordsCounter'
              }
            ]}
            ,listeners : {resize : function(gp,w,h) {
              gp.getStore().each(function(rec) {
                Ext.getCmp(rec.id + 'treePanel').setWidth(w - 35);
              });
            }}
          })
        ]
      }
    ]
  });
}

function initMap() {
  OpenLayers.Util.onImageLoadError = function() {this.src = 'img/blank.png';}

  map = new OpenLayers.Map('map',{
    layers              : [
      new OpenLayers.Layer.XYZ(
         'ESRI Ocean'
        ,'http://services.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/${z}/${y}/${x}.jpg'
        ,{
           sphericalMercator : true
          ,isBaseLayer       : true
          ,wrapDateLine      : false
        }
      )
      ,new OpenLayers.Layer.OSM(
         'OpenStreetMapOlay'
        ,'http://tile.openstreetmap.org/${z}/${x}/${y}.png'
        ,{
           isBaseLayer : false
          ,visibility  : false
        }
      )
      ,new OpenLayers.Layer.CloudMade('CloudMade',{
         key     : '9de23856dd4e449e99f298e9ae605a40'
        ,styleId : 998
        ,opacity : 0.6
      })
      ,new OpenLayers.Layer.OSM(
         'OpenStreetMap'
        ,'http://tile.openstreetmap.org/${z}/${x}/${y}.png'
      )
      ,new OpenLayers.Layer.Google('Google Satellite',{
         type          : google.maps.MapTypeId.SATELLITE
        ,projection    : proj900913
        ,wrapDateLine  : false
      })
      ,new OpenLayers.Layer.Google('Google Hybrid',{
         type          : google.maps.MapTypeId.HYBRID
        ,projection    : proj900913
        ,wrapDateLine  : false
      })
      ,new OpenLayers.Layer.Google('Google Map',{
         type          : google.maps.MapTypeId.MAP
        ,projection    : proj900913
        ,wrapDateLine  : false
      })
      ,new OpenLayers.Layer.Google('Google Terrain',{
         type          : google.maps.MapTypeId.TERRAIN
        ,projection    : proj900913
        ,wrapDateLine  : false
      })
      ,new OpenLayers.Layer.Vector('queryHits',{
         rendererOptions : {zIndexing : true}
        ,styleMap        : new OpenLayers.StyleMap({
          'default' : new OpenLayers.Style(
            OpenLayers.Util.applyDefaults({
               strokeColor   : '#ffffff'
              ,strokeWidth   : 3
              ,graphicZIndex : 10
              ,pointRadius   : 3
              ,display       : '${getDisplay}'
            })
            ,{context  : {getDisplay : function(f) {return f.attributes.hidden ? 'none' : 'visible'}}}
          )
          ,'temporary' : new OpenLayers.Style(
            OpenLayers.Util.applyDefaults({
               strokeColor   : '#00ff00'
              ,strokeWidth   : 3
              ,cursor        : 'pointer'
              ,graphicZIndex : 100
              ,pointRadius   : 3
              ,display       : '${getDisplay}'
            })
            ,{context  : {getDisplay : function(f) {return f.attributes.hidden ? 'none' : 'visible'}}}
          )
          ,'select' : new OpenLayers.Style(
            OpenLayers.Util.applyDefaults({
               strokeColor   : '#ff0000'
              ,strokeWidth   : 3
              ,cursor        : 'pointer'
              ,graphicZIndex : 100
              ,pointRadius   : 3
              ,display       : '${getDisplay}'
            })
            ,{context  : {getDisplay : function(f) {return f.attributes.hidden ? 'none' : 'visible'}}}
          )
        })
      })
    ]
    ,displayProjection : proj4326
    ,controls          : [new OpenLayers.Control.Zoom(),new OpenLayers.Control.Attribution()]
  });

  map.events.register('moveend',this,function() {
    if (navToolbarControl.controls[1].active) {
      navToolbarControl.controls[1].deactivate();
      navToolbarControl.controls[0].activate();
      navToolbarControl.draw();
    }

    map.getLayersByName('OpenStreetMapOlay')[0].setVisibility(map.baseLayer.name == 'ESRI Ocean' && map.getZoom() >= 11);
  });

  var navToolbarControl = new OpenLayers.Control.NavToolbar();
  map.addControl(navToolbarControl);
  navToolbarControl.controls[0].disableZoomBox();

  navToolbarControl.controls[1].events.register('activate',this,function(e) {
    highlightControl.deactivate();
    selectControl.deactivate();
  });
  navToolbarControl.controls[1].events.register('deactivate',this,function(e) {
    highlightControl.activate();
    selectControl.activate();
  });

  map.setBaseLayer(map.getLayersByName(defaultBasemap)[0]);
  var initBounds = new OpenLayers.Bounds();
  initBounds.extend(new OpenLayers.LonLat(-245.5468750000121,-88.25704028272001).transform(proj4326,proj900913));
  initBounds.extend(new OpenLayers.LonLat(224.1406249999924,88.9309349605731).transform(proj4326,proj900913));
  map.zoomToExtent(initBounds);

  map.getLayersByName('queryHits')[0].events.register('featuresadded',this,function(e) {
    var win = Ext.getCmp('mappedFeaturesWin');
    if (!win) {
      return;
    }
    win.removeAll();
    var recs        = [];
    var attributesH = {};
    for (var i = 0; i < e.object.features.length; i++) {
      var rec = {
         id     : e.object.features[i].attributes.id
        ,hidden : false
        ,name   : e.object.features[i].attributes.title
      };
      if (e.object.features[i].attributes.properties) {
        for (var j = 0; j < e.object.features[i].attributes.properties.length; j++) {
          attributesH[e.object.features[i].attributes.properties[j]] = true;
          rec[e.object.features[i].attributes.properties[j]]         = 'yes';
        }
      }
      recs.push(rec);
    }
    var attributesA = [];
    for (var i in attributesH) {
      attributesA.push(i);
    }
    attributesA.sort();
    var col = [];
    var col = [
      {id : 'name',dataIndex : 'name',header : 'Name',width : 150,renderer : function(val,metadata,rec) {
         metadata.attr = 'ext:qtip="' + val + '"';
         if (rec.get('hidden')) {
           return '<font color=gray>' + val + '</font>';
         }
         else {
           return val;
         }
      }}
    ];
    for (var i = 0; i < attributesA.length; i++) {
      if (!new RegExp(/^(id|hidden|name)$/).test(attributesA[i])) {
        col.push({
           id        : attributesA[i]
          ,dataIndex : attributesA[i]
          ,header    : attributesA[i]
          ,align     : 'center'
        });
      }
    }
    var sto =  new Ext.data.ArrayStore({fields : ['id','hidden','name'].concat(attributesA)});
    for (var i = 0; i < recs.length; i++) {
      recs[i] = new sto.recordType(recs[i]);
    }
    sto.add(recs);
    win.add(new Ext.grid.GridPanel({
       id               : 'activeFeaturesGridPanel'
      ,store            : sto
      ,colModel         : new Ext.grid.ColumnModel({defaultSortable : true,columns : col})
      ,autoExpandColumn : 'name'
      ,border           : false
      ,enableHdMenu     : false
      ,loadMask         : true
    }));
    win.doLayout();
  });
  map.getLayersByName('queryHits')[0].events.register('featuresremoved',this,function(e) {
    var gp = Ext.getCmp('activeFeaturesGridPanel');
    if (gp) {
      var sto = gp.getStore();
      var recs = [];
      for (var i = 0; i < e.features.length; i++) {
        sto.each(function(rec) {
          if (rec.id == e.features[i].attributes.id) {
            recs.push(rec);
          }
        });
      }
      sto.remove(recs);
    }
  });
  map.getLayersByName('queryHits')[0].events.register('featuresmodified',this,function(e) {
    var gp = Ext.getCmp('activeFeaturesGridPanel');
    if (gp) {
      var sto = gp.getStore();
      for (var i = 0; i < e.features.length; i++) {
        sto.each(function(rec) {
          if (rec.id == e.features[i].attributes.id) {
            rec.set('hidden',e.features[i].attributes.hidden);
            rec.commit();
          } 
        });
      }
    }
  });

  highlightControl = new OpenLayers.Control.SelectFeature(map.getLayersByName('queryHits')[0],{
     highlightOnly  : true
    ,hover          : true
    ,renderIntent   : 'temporary'
    ,eventListeners : {
      beforefeaturehighlighted : function(e) {
        var el = getOpenLayersElement(e);
        if (el && !el.toolTip) {
          el.toolTip = new Ext.ToolTip({
             title        : e.feature.attributes.title
            ,html         : '<table class="popup">'
              + '<tr><td>' + e.feature.attributes.summary + '</td></tr>'
              + '<tr><td align=center><font color=gray>Click on the feature outline to add to cart.</font></td></tr>'
              + '</table>'
            ,target       : el
            ,showDelay    : 0
            ,hideDelay    : 0
            ,dismissDelay : 0
            ,hideMode     : 'offsets'
            ,baseCls      : 'custom-x-tip'
            ,width        : 280
            ,closable     : true
            ,listeners    : {
              // make sure only one TT is showing (FF has a problem otherwise)
              beforeshow : function(tt) {
                for (var i = 0; i < toolTipQueue.length; i++) {
                  var oldTt =  Ext.getCmp(toolTipQueue[i]);
                  if (oldTt) {
                    oldTt.hide();
                  }
                }
                toolTipQueue.push(tt.id);
                knownToolTips.push(tt);
              }
              ,hide : function(tt) {
                for (var i = 0; i < toolTipQueue.length; i++) {
                  if (toolTipQueue[i] == tt.id) {
                    toolTipQueue.splice(i,1);
                  }
                }
              }
            }
          });
        }
      }
    }
  }); 
  map.addControl(highlightControl);
  highlightControl.activate();

  selectControl = new OpenLayers.Control.SelectFeature(map.getLayersByName('queryHits')[0],{
     toggle : true
    ,eventListeners : {
      featurehighlighted : function(e) {
        goQueryGridPanelRowById(e.feature.attributes.id,true);
      }
    }
  });
  map.addControl(selectControl);
  selectControl.activate();

  var mouseControl = new OpenLayers.Control.MousePosition();
  map.addControl(mouseControl);

  var bboxLayer   = new OpenLayers.Layer.Vector('bbox');
  map.addLayer(bboxLayer);
  bboxLayer.events.register('sketchstarted',this,function(e) {
    e.object.removeFeatures(e.object.features);
  });
  bboxControl = new OpenLayers.Control.DrawFeature(
     bboxLayer
    ,OpenLayers.Handler.RegularPolygon
    ,{
      handlerOptions : {
         sides        : 4
        ,irregular    : true
        ,persist      : true
      }
    }
  );
  map.addControl(bboxControl);
  bboxControl.events.register('featureadded',this,function(e) {
    e.object.deactivate();
  });
  bboxControl.events.register('activate',this,function(e) {
    highlightControl.deactivate();
    selectControl.deactivate();
  });
  bboxControl.events.register('deactivate',this,function(e) {
    highlightControl.activate();
    selectControl.activate();
  });

  new Ext.Button({
     text     : 'Zoom to results'
    ,renderTo : 'mapControlsResetMap'
    ,width    : 100
    ,height   : 26
    ,icon     : 'img/zoom_extend16.png'
    ,tooltip  : 'Reset the map to include all results'
    ,handler  : function() {
      map.zoomToExtent(map.getLayersByName('queryHits')[0].getDataExtent());
    }
  });

  new Ext.Button({
     text     : 'Background'
    ,renderTo : 'mapControlsChangeBackground'
    ,width    : 100
    ,height   : 26
    ,icon     : 'img/map16.png'
    ,tooltip  : 'Select a different map background'
    ,menu     : {items : [
      {
         text         : 'CloudMade'
        ,checked      : defaultBasemap == 'CloudMade'
        ,group        : 'basemap'
        ,handler      : function() {
          var lyr = map.getLayersByName('CloudMade')[0];
          if (lyr.isBaseLayer) {
            map.setBaseLayer(lyr);
            lyr.redraw();
          }
        }
      }
      ,'-'
      ,{
         text         : 'ESRI Ocean'
        ,checked      : defaultBasemap == 'ESRI Ocean'
        ,group        : 'basemap'
        ,handler      : function() {
          var lyr = map.getLayersByName('ESRI Ocean')[0];
          if (lyr.isBaseLayer) {
            map.setBaseLayer(lyr);
            lyr.redraw();
          }
        }
      }
      ,'-'
      ,{
         text         : 'Google Hybrid'
        ,checked      : defaultBasemap == 'Google Hybrid'
        ,group        : 'basemap'
        ,handler      : function() {
          var lyr = map.getLayersByName('Google Hybrid')[0];
          if (lyr.isBaseLayer) {
            map.setBaseLayer(lyr);
            lyr.redraw();
          }
        }
      }
      ,{
         text         : 'Google Satellite'
        ,checked      : defaultBasemap == 'Google Satellite'
        ,group        : 'basemap'
        ,handler      : function() {
          var lyr = map.getLayersByName('Google Satellite')[0];
          if (lyr.isBaseLayer) {
            map.setBaseLayer(lyr);
            lyr.redraw();
          }
        }
      }
      ,{
         text         : 'Google Terrain'
        ,checked      : defaultBasemap == 'Google Terrain'
        ,group        : 'basemap'
        ,handler      : function() {
          var lyr = map.getLayersByName('Google Terrain')[0];
          if (lyr.isBaseLayer) {
            map.setBaseLayer(lyr);
            lyr.redraw();
          }
        }
      }
      ,'-'
      ,{
         text         : 'OpenStreetMap'
        ,checked      : defaultBasemap == 'OpenStreetMap'
        ,group        : 'basemap'
        ,handler      : function() {
          var lyr = map.getLayersByName('OpenStreetMap')[0];
          if (lyr.isBaseLayer) {
            map.setBaseLayer(lyr);
            lyr.redraw();
          }
        }
      }
    ]}
  });

/*
  new Ext.Window({
     title           : 'Mapped features'
    ,id              : 'mappedFeaturesWin'
    ,layout          : 'fit'
    ,width           : 320
    ,height          : 440
    ,constrainHeader : true
    ,closable        : false
  }).show();
*/
}

function getOpenLayersElement(e) {
  var el = document.getElementById('OpenLayers.Geometry.LineString_' + (Number(e.feature.id.split('_')[e.feature.id.split('_').length - 1]) + 1));
  if (!el) {
    el = document.getElementById('OpenLayers.Geometry.Point_' + (Number(e.feature.id.split('_')[e.feature.id.split('_').length - 1]) - 8));
  }
  if (!el) {
    el = document.getElementById('OpenLayers.Geometry.Point_' + (Number(e.feature.id.split('_')[e.feature.id.split('_').length - 1]) - 1));
  }
  return el;
}

function sosGetCaps(node,cb) {
  if (knownGetCaps[node.attributes.gpId + node.attributes.url]) {
    Ext.Msg.alert('Error','This service has already been added to your map.');
    cb([],{status : true});
    return;
  }
  knownGetCaps[node.attributes.gpId + node.attributes.url] = true;

  function goFeatures(offerings) {
    var features = [];
    for (var i = 0; i < offerings.length; i++) {
      var properties = getProperties({offering : offerings[i]});
      var props      = [];
      var propsShort = [];
      for (var p in properties) {
        var s = p.split(/#|\//).pop();
        props.push(s);
        propsShort.push(s.substr(0,40) + (s.length > 40 ? '...' : ''));
        
      }
      props.sort();
      var f = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(offerings[i].llon,offerings[i].llat).transform(proj4326,proj900913));
      f.attributes = {
         id         : Ext.id()
        ,title      : offerings[i].shortName
        ,summary    : propsShort.join('<br>')
        ,offering   : offerings[i]
        ,properties : props
      };
      features.push(f);
    }
    map.getLayersByName('queryHits')[0].addFeatures(features);
    var nodesByText = {};
    var nodesText   = [];
    for (var i = 0; i < features.length; i++) {
      nodesByText[features[i].attributes.title.toLowerCase()] = {
         id   : features[i].attributes.id
        ,text : features[i].attributes.title
        ,leaf : true
        ,icon : 'img/zoom16.png'
      };
      nodesText.push(features[i].attributes.title.toLowerCase());
    }
    nodesText.sort();
    var nodes = [];
    for (var i = 0; i < nodesText.length; i++) {
      nodes.push(nodesByText[nodesText[i]]);
    }
    cb(nodes,{status : true});
  }

  var gp = Ext.getCmp('activeFeaturesGridPanel');
  if (gp) {
    gp.getStore().fireEvent('beforeload');
  }

  OpenLayers.Request.issue({
     url      : 'get.php?url=' + encodeURIComponent(node.attributes.url)
    ,callback : function(r) {
      var sos = new SOSCapabilities(new OpenLayers.Format.XML().read(r.responseText));
      if (sos.type === 'EXCEPTION') {
        Ext.Msg.alert('SOS exception',sos.exception_error);
        cb([],{status : true});
        return;
      }

      // only pass along offerings that are outside the area of interest (if any)
      var offerings = [];
      if (bboxControl.layer.features.length > 0) {
        var aoi = bboxControl.layer.features[0].geometry.getBounds();
        for (var i = 0; i < sos.offerings.length; i++) {
          if (aoi.containsBounds(new OpenLayers.Geometry.Point(sos.offerings[i].llon,sos.offerings[i].llat).transform(proj4326,proj900913).getBounds())) {
            offerings.push(sos.offerings[i]);
          }
        }
      }
      else {
        offerings = sos.offerings;
      }

      goFeatures(offerings);
    }
  });
}

function getProperties(attr) {
  var p = {};
  if (!attr.offering) {
    return false;
  }
  attr.offering.properties.sort();
  for (var i = 0; i < attr.offering.properties.length; i++) {
    p[attr.offering.properties[i]] = attr.offering.getObsUrl(attr.offering.properties[i]);
  }
  return p;
}

function wmsGetCaps(node,cb) {
  if (knownGetCaps[node.attributes.gpId + node.attributes.url]) {
    Ext.Msg.alert('Error','This service has already been added to your map.');
    cb([],{status : true});
    return;
  }
  knownGetCaps[node.attributes.gpId + node.attributes.url] = true;

  OpenLayers.Request.issue({
     url      : 'get.php?url=' + encodeURIComponent(node.attributes.url)
    ,callback : function(r) {
      var caps = new OpenLayers.Format.WMSCapabilities().read(r.responseText);
      if (!caps || !caps.capability) {
        Ext.Msg.alert('WMS exception','There was an error querying this data service.');
        cb([],{status : true});
        return;
      }
      var nodesByText = {};
      var nodesText   = [];
      var aoi;
      if (bboxControl.layer.features.length > 0) {
        aoi = bboxControl.layer.features[0].geometry.getBounds();
      }
      for (var i = 0; i < caps.capability.layers.length; i++) {
        var bboxOk = true;
        if (
          aoi
          && caps.capability.layers[i].llbbox
          && !aoi.intersectsBounds(new OpenLayers.Bounds(caps.capability.layers[i].llbbox[0],caps.capability.layers[i].llbbox[1],caps.capability.layers[i].llbbox[2],caps.capability.layers[i].llbbox[3]).transform(proj4326,proj900913))
        ) {
          bboxOk = false;
        }
        if (bboxOk) {
          nodesByText[(caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')').toLowerCase()] = {
             id   : caps.capability.layers[i].name
            ,text : caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')'
            ,qtip : caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')'
            ,leaf : true
            ,icon : 'img/layer16.png'
          };
          nodesText.push(String(caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')').toLowerCase());
        }
      }
      nodesText.sort();
      var nodes = [];
      for (var i = 0; i < nodesText.length; i++) {
        nodes.push(nodesByText[nodesText[i]]);
      }
      cb(nodes,{status : true});
    }
  });
}

function opendapGetCaps(node,cb) {
  if (knownGetCaps[node.attributes.gpId + node.attributes.url]) {
    Ext.Msg.alert('Error','This service has already been added to your map.');
    cb([],{status : true});
    return;
  }
  knownGetCaps[node.attributes.gpId + node.attributes.url] = true;

  loadDataset(node.attributes.url,function(json) {
    if (!json) {
      Ext.Msg.alert('OPeNDAP exception',"We're sorry, there was a problem accessing this service.");
      cb([],{status : false});
      return;
    }
    else {
      var nodesByText = {};
      var nodesText   = [];
      for (var v in json) {
        if (!new RegExp(/^(attributes|title)$/).test(v)) {
          var s = v;
          if (json[v].attributes && json[v].attributes.long_name) {
            s = json[v].attributes.long_name + ' (' + v + ')'
          }
          nodesByText[s.toLowerCase()] = {
             id   : s
            ,text : s
            ,qtip : s
            ,leaf : true
            ,icon : 'img/layer16.png'
          };
          nodesText.push(s.toLowerCase());
        }
      }
      nodesText.sort();
      var nodes = [];
      for (var i = 0; i < nodesText.length; i++) {
        nodes.push(nodesByText[nodesText[i]]);
      }
      cb(nodes,{status : true});
    }
  },'get.php');
}

function goQueryGridPanelRowById(gpId,focus) {
  var gp  = Ext.getCmp('queryGridPanel');
  var sto = gp.getStore();
  var idx = 0;
  sto.each(function(rec) {
    if (rec.id == gpId) {
      var sm = gp.getSelectionModel();
      sm.suspendEvents();
      sm.selectRow(idx);
      sm.resumeEvents();
      if (focus) {
        gp.getView().focusRow(idx);
      }
    }
    idx++;
  });
}

function findAndZoomToFeatureById(id) {
  var found = false;
  var lyr   = map.getLayersByName('queryHits')[0];
  selectControl.unselectAll();
  for (var i = 0; i < lyr.features.length; i++) {
    if (lyr.features[i].attributes.id == id) {
      map.zoomToExtent(lyr.features[i].geometry.getBounds().scale(5));
      selectControl.select(lyr.features[i]);
      found = true;
    }
  }
  return found;
}

function resetAdvancedSearchOptions() {
  Ext.getCmp('searchBboxRadioGroup').reset();
  Ext.getCmp('searchStartDate').reset();
  Ext.getCmp('searchEndDate').reset();
  Ext.getCmp('serviceCheckboxOpendap').reset();
  Ext.getCmp('serviceCheckboxSos').reset();
  Ext.getCmp('serviceCheckboxWms').reset();
}

function drawBbox() {
  Ext.getCmp('bboxRadioGroupYes').setValue(true);
  bboxControl.layer.removeFeatures(bboxControl.layer.features);
  bboxControl.activate();
}

function makeTimeParam(d) {
  return d.getUTCFullYear() + '-' + String.leftPad(d.getUTCMonth() + 1,2,'0') + '-' + String.leftPad(d.getUTCDate(),2,'0');
}

function buildFilter() {
  var filters = [
    new OpenLayers.Filter.Comparison({
       type     : OpenLayers.Filter.Comparison.EQUAL_TO
      ,property : 'sys.siteuuid'
      ,value    : '{E4949969-468A-4B10-823D-9BF1BF0785B2}'
    })
    ,new OpenLayers.Filter.Comparison({
       type     : OpenLayers.Filter.Comparison.LIKE
      ,property : 'AnyText'
      ,value    : Ext.getCmp('anyTextSearchField').getValue() != '' ? Ext.getCmp('anyTextSearchField').getValue() : '*'
    })
  ];

  if (Ext.getCmp('searchStartDate').getValue()) {
    filters.push(new OpenLayers.Filter.Comparison({
       type     : OpenLayers.Filter.Comparison.GREATER_THAN_OR_EQUAL_TO
      ,property : 'startDate'
      ,value    : makeTimeParam(Ext.getCmp('searchStartDate').getValue())
    }));
  }

  if (Ext.getCmp('searchEndDate').getValue()) {
    filters.push(new OpenLayers.Filter.Comparison({
       type     : OpenLayers.Filter.Comparison.LESS_THAN_OR_EQUAL_TO
      ,property : 'endDate'
      ,value    : makeTimeParam(Ext.getCmp('searchEndDate').getValue())
    }));
  }

  if (bboxControl.layer.features.length > 0) {
    var f = bboxControl.layer.features[0].clone();
    filters.push(new OpenLayers.Filter.Spatial({
       type       : OpenLayers.Filter.Spatial.BBOX
      ,value      : f.geometry.getBounds().transform(proj900913,proj4326)
      ,property   : 'ows:BoundingBox'
      ,projection : 'EPSG:4326'
    }));
  }

  if (Ext.getCmp('serviceCheckboxSos').getValue() || Ext.getCmp('serviceCheckboxWms').getValue() || Ext.getCmp('serviceCheckboxOpendap').getValue()) {
    var f = [];
    if (Ext.getCmp('serviceCheckboxSos').getValue()) {
      f.push(new OpenLayers.Filter.Comparison({
         type     : OpenLayers.Filter.Comparison.LIKE
        ,property : 'apiso:ServiceType'
        ,value    : '*sos*'
      }));
    }
    if (Ext.getCmp('serviceCheckboxWms').getValue()) {
      f.push(new OpenLayers.Filter.Comparison({
         type     : OpenLayers.Filter.Comparison.LIKE
        ,property : 'apiso:ServiceType'
        ,value    : '*wms*'
      }));
    }
    if (Ext.getCmp('serviceCheckboxOpendap').getValue()) {
      f.push(new OpenLayers.Filter.Comparison({
         type     : OpenLayers.Filter.Comparison.LIKE
        ,property : 'apiso:ServiceType'
        ,value    : '*opendap*'
      }));
    }
    if (f.length > 1) {
      filters.push(new OpenLayers.Filter.Logical({
          type     : OpenLayers.Filter.Logical.OR
         ,filters  : f
      }));
    }
    else {
      filters.push(f[0]);
    }
  }

  var filter = new OpenLayers.Filter.Logical({
     type    : OpenLayers.Filter.Logical.AND
    ,filters : filters
  });

  var xml        = new OpenLayers.Format.XML();
  var filter_1_1 = new OpenLayers.Format.Filter({version: '1.1.0'});

  return [
     '<?xml version="1.0"?><csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" version="2.0.2" service="CSW" resultType="results" outputSchema="http://www.isotc211.org/2005/gmd" startPosition="1" maxRecords="1000"> <csw:Query xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml" typeNames="csw:Record"> <csw:ElementSetName>full</csw:ElementSetName> <csw:Constraint version="1.1.0">'
    ,xml.write(filter_1_1.write(filter))
    ,'</csw:Constraint> </csw:Query> </csw:GetRecords>'
  ].join('');
}
