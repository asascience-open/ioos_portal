var sampleCSW = {
   'SOS' : '<?xml version="1.0"?>  <csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" version="2.0.2" service="CSW" resultType="results" outputSchema="http://www.isotc211.org/2005/gmd" startPosition="1" maxRecords="1000">   <csw:Query typeNames="csw:Record" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">   <csw:ElementSetName>full</csw:ElementSetName>    <csw:Constraint version="1.1.0">   <ogc:Filter>     <ogc:And>       <ogc:PropertyIsEqualTo>         <ogc:PropertyName>sys.siteuuid</ogc:PropertyName>         <ogc:Literal>{E4949969-468A-4B10-823D-9BF1BF0785B2}</ogc:Literal>       </ogc:PropertyIsEqualTo>       <ogc:PropertyIsLike wildCard="*" escape="\" singleChar="?">          <ogc:PropertyName>apiso:ServiceType</ogc:PropertyName>         <ogc:Literal>*sos*</ogc:Literal>       </ogc:PropertyIsLike>     </ogc:And>    </ogc:Filter>  </csw:Constraint>  </csw:Query> </csw:GetRecords>'
  ,'OPeNDAP' : '<?xml version="1.0"?>  <csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" version="2.0.2" service="CSW" resultType="results" outputSchema="http://www.isotc211.org/2005/gmd" startPosition="1" maxRecords="1000">   <csw:Query typeNames="csw:Record" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">   <csw:ElementSetName>full</csw:ElementSetName>    <csw:Constraint version="1.1.0">   <ogc:Filter>     <ogc:And>       <ogc:PropertyIsEqualTo>         <ogc:PropertyName>sys.siteuuid</ogc:PropertyName>         <ogc:Literal>{E4949969-468A-4B10-823D-9BF1BF0785B2}</ogc:Literal>       </ogc:PropertyIsEqualTo>       <ogc:PropertyIsLike wildCard="*" escape="\" singleChar="?">          <ogc:PropertyName>apiso:ServiceType</ogc:PropertyName>         <ogc:Literal>*opendap*</ogc:Literal>       </ogc:PropertyIsLike>     </ogc:And>    </ogc:Filter>  </csw:Constraint>  </csw:Query> </csw:GetRecords>'
  ,'WMS' : '<?xml version="1.0"?>  <csw:GetRecords xmlns:csw="http://www.opengis.net/cat/csw/2.0.2" version="2.0.2" service="CSW" resultType="results"  outputSchema="http://www.isotc211.org/2005/gmd" startPosition="1" maxRecords="1000">   <csw:Query typeNames="csw:Record" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml">   <csw:ElementSetName>full</csw:ElementSetName>    <csw:Constraint version="1.1.0">   <ogc:Filter>     <ogc:And>       <ogc:PropertyIsEqualTo>         <ogc:PropertyName>sys.siteuuid</ogc:PropertyName>         <ogc:Literal>{E4949969-468A-4B10-823D-9BF1BF0785B2}</ogc:Literal>       </ogc:PropertyIsEqualTo>       <ogc:PropertyIsLike wildCard="*" escape="\" singleChar="?">          <ogc:PropertyName>apiso:ServiceType</ogc:PropertyName>         <ogc:Literal>*wms*</ogc:Literal>       </ogc:PropertyIsLike>     </ogc:And>    </ogc:Filter>  </csw:Constraint>  </csw:Query> </csw:GetRecords>'
};

var map;
var highlightControl;
var selectControl;
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
    ,items  : [
      {
         region    : 'north'
        ,id        : 'searchControlPanel'
        ,height    : 50
        ,layout    : 'column'
        ,defaults  : {border : false}
        ,items     : [
          {
             columnWidth : 1
            ,html        : '<table width="100%"><tr><td style="padding-bottom:4px;font:12px/13px tahoma,helvetica,sans-serif;color:gray" align=center>Click on one of these super sexy buttons to fire a CSW query.</td></tr></table>'
          }
          ,{
             columnWidth : 0.10
            ,html        : '&nbsp;'
          }
          ,new Ext.Button({
             columnWidth  : 0.20 
            ,text         : 'WMS'
            ,toggleGroup  : 'searchGroup'
            ,allowDepress : false
            ,handler      : function() {
              var sto = Ext.getCmp('queryGridPanel').getStore();
              sto.setBaseParam('xmlData',sampleCSW['WMS']);
              sto.load();
            }
          })
          ,{
             columnWidth : 0.10
            ,html        : '&nbsp;'
          }
          ,new Ext.Button({
             columnWidth  : 0.20
            ,text         : 'OPeNDAP'
            ,toggleGroup  : 'searchGroup'
            ,allowDepress : false
            ,handler      : function() {
              var sto = Ext.getCmp('queryGridPanel').getStore();
              sto.setBaseParam('xmlData',sampleCSW['OPeNDAP']);
              sto.load();
            }
          })
          ,{
             columnWidth : 0.10
            ,html        : '&nbsp;'
          }
          ,new Ext.Button({
             columnWidth  : 0.20
            ,text         : 'SOS'
            ,toggleGroup  : 'searchGroup'
            ,allowDepress : false
            ,pressed      : true
            ,handler      : function() {
              var sto = Ext.getCmp('queryGridPanel').getStore();
              sto.setBaseParam('xmlData',sampleCSW['SOS']);
              sto.load();
            }
          })
          ,{
             columnWidth : 0.10
            ,html        : '&nbsp;'
          }
        ]
      }
      ,{
         region    : 'center'
        ,layout    : 'fit'
        ,split     : true
        ,defaults  : {
           border     : false
          ,autoScroll : true
        }
        ,html      : '<div id="map"><div id="mapDirections"><table><tr><td>&nbsp;</td><td class="directions">Use the panel to the left to locate data on the map.<br>Click on any feature outline below to see more details and to add it to your cart.</td><td>&nbsp;</td></tr></table></div></div>'
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
        ,layout   : 'fit'
        ,split    : true
        ,defaults : {
           border     : false
          ,autoScroll : true
        }
        ,items    : new Ext.grid.GridPanel({
           id               : 'queryGridPanel'
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
                       {name : 'type'    ,mapping : 'srv_serviceType > gco_LocalName'}
                      ,{name : 'url'     ,mapping : 'srv_containsOperations > srv_SV_OperationMetadata > srv_connectPoint > gmd_CI_OnlineResource > gmd_linkage > gmd_URL'}
                      ,{name : 'keywords',convert : (function(){
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
              }
              ,load      : function(sto) {
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
                });
                var lyr = map.getLayersByName('queryHits')[0];
                lyr.addFeatures(features);
                map.zoomToExtent(lyr.getDataExtent());
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
              var sto = view.grid.getStore();
              sto.each(function(rec) {
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
                    ,leaf : !new RegExp(/service=(sos|wms)/i).test(services[i].data.url)
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
                    }
                  })
                  ,listeners   : {
                    click : function(node,e) {
                      goQueryGridPanelRowById(node.attributes.gpId ? node.attributes.gpId : node.parentNode.attributes.gpId,false);
                      if (node.leaf) {
                        if (!findAndZoomToFeatureById(node.id)) {
                          Ext.Msg.alert('Unknown service',"I'm sorry, but I don't know how to process this <a target=_blank href='" + node.attributes.url + "'>" + node.attributes.text + "</a> service.");
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
                    ,beforecollapsenode : function(node) {
                      var n = {};
                      for (var i = 0; i < node.childNodes.length; i++) {
                        n[node.childNodes[i].id] = true;
                      }
                      var lyr = map.getLayersByName('queryHits')[0];
                      var f   = [];
                      for (var i = 0; i < lyr.features.length; i++) {
                        if (n[lyr.features[i].attributes.id]) {
                          lyr.features[i].attributes.hidden = true;
                          f.push(lyr.features[i]);
                        }
                      }
                      lyr.events.triggerEvent('featuresmodified',{features : f});
                      lyr.redraw();
                    }
                  }
                });
              });
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
          ,listeners : {resize : function(gp,w,h) {
            gp.getStore().each(function(rec) {
              Ext.getCmp(rec.id + 'treePanel').setWidth(w - 35);
            });
          }}
        })
      }
    ]
  });

  var sto = Ext.getCmp('queryGridPanel').getStore();
  sto.setBaseParam('xmlData',sampleCSW['SOS']);
  sto.load();
}

function initMap() {
  OpenLayers.Util.onImageLoadError = function() {this.src = 'img/blank.png';}

  map = new OpenLayers.Map('map',{
    layers              : [
      new OpenLayers.Layer.Google('Google Satellite',{
         type              : google.maps.MapTypeId.SATELLITE
        ,sphericalMercator : true
        ,wrapDateLine      : false
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
  });
  var bounds = new OpenLayers.Bounds();
  bounds.extend(new OpenLayers.LonLat(-245.5468750000121,-88.25704028272001).transform(proj4326,proj900913));
  bounds.extend(new OpenLayers.LonLat(224.1406249999924,88.9309349605731).transform(proj4326,proj900913));
  map.zoomToExtent(bounds);

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
  if (knownGetCaps[node.attributes.url]) {
    Ext.Msg.alert('Error','This service has already been added to your map.');
    cb([],{status : true});
    return;
  }
  knownGetCaps[node.attributes.url] = true;

  function goFeatures(sos) {
    var features = [];
    for (var i = 0; i < sos.offerings.length; i++) {
      var properties = getProperties({offering : sos.offerings[i]});
      var props = [];
      for (var p in properties) {
        var s = p.split(/#|\//).pop();
        s = s.substr(0,40) + (s.length > 40 ? '...' : '');
        props.push(s);
      }
      props.sort();
      var f = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(sos.offerings[i].llon,sos.offerings[i].llat).transform(proj4326,proj900913));
      f.attributes = {
         id         : Ext.id()
        ,title      : sos.offerings[i].shortName
        ,summary    : props.join('<br>')
        ,offering   : sos.offerings[i]
        ,properties : props
      };
      features.push(f);
    }
    map.getLayersByName('queryHits')[0].addFeatures(features);
    var nodesByText = {};
    var nodesText   = [];
    for (var i = 0; i < features.length; i++) {
      nodesByText[features[i].attributes.title] = {
         id   : features[i].attributes.id
        ,text : features[i].attributes.title
        ,leaf : true
        ,icon : 'img/zoom16.png'
      };
      nodesText.push(features[i].attributes.title);
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
        return;
      }
      if (sos.offerings.length > 250) {
        Ext.MessageBox.confirm('Warning','This service has returned ' + sos.offerings.length + ' features which may slow your browser.  Are you sure you wish to continue?  If you answer no, you will not be able to display this service until you start the query process over.',function(but) {
          if (but == 'yes') {
            goFeatures(sos);
          }
          else {
            cb([],{status : false});
            var gp = Ext.getCmp('activeFeaturesGridPanel');
            if (gp) {
              gp.getStore().fireEvent('load');
            }
          }
        });
      }
      else {
        goFeatures(sos);
      }
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
  if (knownGetCaps[node.attributes.url]) {
    Ext.Msg.alert('Error','This service has already been added to your map.');
    cb([],{status : true});
    return;
  }
  knownGetCaps[node.attributes.url] = true;

  OpenLayers.Request.issue({
     url      : 'get.php?url=' + encodeURIComponent(node.attributes.url)
    ,callback : function(r) {
      var caps = new OpenLayers.Format.WMSCapabilities().read(r.responseText);
      var nodesByText = {};
      var nodesText   = [];
      for (var i = 0; i < caps.capability.layers.length; i++) {
        nodesByText[caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')'] = {
           id   : caps.capability.layers[i].name
          ,text : caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')'
          ,qtip : caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')'
          ,leaf : true
          ,icon : 'img/layer16.png'
        };
        nodesText.push(caps.capability.layers[i].title + ' (' + caps.capability.layers[i].name + ')');
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
