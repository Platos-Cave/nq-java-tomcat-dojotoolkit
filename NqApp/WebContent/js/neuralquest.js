require([
'dojo/_base/array', 'dojo/dom-style', 'dojo/_base/fx', 'dojo/ready', 'dojo/topic', "dojo/on", 'dojo/hash', 'dijit/registry', 
'dojo/dom', 'dojo', 'dojo/_base/lang', 'dojo/_base/declare','dojo/_base/array', 'dojo/dom-construct', 
'dojo/_base/declare', 'dojo/store/Observable', 'dojo/store/Cache', 'dojo/store/JsonRest', 'dojo/store/Memory',
'dijit/tree/dndSource', 'dojo/Deferred', 'dojo/when', 'dojo/query', 'dijit/layout/BorderContainer', 
'dijit/layout/TabContainer', 'dijit/layout/ContentPane', 'dijit/layout/AccordionContainer', 'dijit/Editor', 
'nq/nqProcessChart', 'nq/nqClassChart', 'nq/nqForm', 'nq/nqTable', 'nq/nqJsonRest', 'nq/nqTree', 'nq/nqObjectStoreModel', 'nq/nqDocument', 'nq/nqReport',
 'dojo/promise/instrumentation', 'dojox/html/styles', 'dojo/query!css2'], 
function(arrayUtil, domStyle, fx, ready, topic, on, hash, registry,
		dom, dojo, lang, declare, array, domConstruct,
		declare, Observable, Cache, JsonRest, Memory, 
		dndSource, Deferred, when, query, BorderContainer, 
		TabContainer, ContentPane, AccordionContainer, Editor, 
		nqProcessChart, nqClassChart, nqForm, nqTable, nqJsonRest, nqTree, nqObjectStoreModel, nqDocument, nqReport,
		instrumentation, styles) {
	
	_nqMemoryStore = Observable(new Memory({}));
	_nqDataStore = new Cache(new nqJsonRest({target:"data/"}), _nqMemoryStore);
	var _transaction = _nqDataStore.transaction();
	_nqSchemaMemoryStore = new Memory();
	_nqSchemaStore = Cache(new JsonRest({target:"schema/"}), _nqSchemaMemoryStore);
	//////////////////////////////////////////////////////////////////////////////
	// Initialize
	//////////////////////////////////////////////////////////////////////////////
	ready( function() {
		topic.subscribe("/dojo/hashchange", interpritHash);
		on(registry.byId('cancelButtonId'), 'click', function(event){_transaction.abort();});
		on(registry.byId('saveButtonId'), 'click', function(event){_transaction.commit();});
		on(registry.byId('helpButtonId'), 'change', function(val){
			dojox.html.insertCssRule('.helpTextInvisable', 'display:'+val?"block":"none"+';', 'nq.css');
		});


		//Load the schema in its entirety 
		var viewId = getState(0).viewId;
		if(!viewId) viewId = 842;
		var query = _nqSchemaStore.query({viewId: viewId});
		when(query, function(objects){
			fx.fadeOut({node: 'loadingOverlay',	onEnd: function(node){domStyle.set(node, 'display', 'none');}}).play();
			if(hash() == "") hash("842.1784.824.846.1866", true);
			else interpritHash();
		});
	});
	//////////////////////////////////////////////////////////////////////////////
	// Interprit the Hash Change
	//////////////////////////////////////////////////////////////////////////////
	function interpritHash(){	
		var hashArr = hash().split('.');
		var levels = Math.ceil(hashArr.length/3);
		for(var level = 0; level<levels; level++){
			var state = getState(level);
			if(state.viewId && !registry.byId('acctab'+state.viewId)){
				var viewDef = _nqSchemaStore.get(state.viewId);
				var parentContentPane = findParentContainer(viewDef);
				if(viewDef.containerType == 'Accordion') createAccordion(parentContentPane, state.viewId, state.tabId, level);
				else createTabs(parentContentPane, state.viewId, state.tabId, level);
				parentContentPane.resize();
			}
			createWidgets(level);
		}
	}
	//////////////////////////////////////////////////////////////////////////////
	// Find the Parent Container and clear it if its a slave container of a higher view
	//////////////////////////////////////////////////////////////////////////////
	function findParentContainer(viewDef){
		var parentViewDef = null;
		if(viewDef.parentWidgetId) {
			var widgetDef = _nqSchemaStore.get(viewDef.parentWidgetId);
			if(widgetDef.parentTabId) {
				var tabDef = _nqSchemaStore.get(widgetDef.parentTabId);
				if(tabDef.parentViewId) parentViewDef = _nqSchemaStore.get(tabDef.parentViewId);
			}
		}
		if(parentViewDef) {
			if(parentViewDef.entity == 'tab'){
				if(parentViewDef.displayType == 'Sub Accordion') {
					var parentContentPane = registry.byId('slave'+parentViewDef.id);
					// if we're filling a slave, clean it first. It may have been used by another view before
					arrayUtil.forEach(parentContentPane.getChildren(), function(childWidget){
						if(childWidget.destroyRecursive) childWidget.destroyRecursive();
					});
					return parentContentPane;
				}
				//else return registry.byId('tab'+state.tabId);
			}			
			else { // view
				if(parentViewDef.containerType == 'Accordion') {
					var parentContentPane = registry.byId('slave'+parentViewDef.id);
					// if we're filling a slave, clean it first. It may have been used by another view before
					arrayUtil.forEach(parentContentPane.getChildren(), function(childWidget){
						if(childWidget.destroyRecursive) childWidget.destroyRecursive();
					});
					return parentContentPane;
				}
				//else return registry.byId('tab'+state.tabId);
			}			
		}
		return registry.byId('placeholder');
	}
	//////////////////////////////////////////////////////////////////////////////
	// Add an Accordian container in a border container
	//////////////////////////////////////////////////////////////////////////////
	function createAccordion(parentContentPane, parentTabOrViewId, selectedTabId, level){
		//obtain horizontal, vertical, none from viewDef?
		var design = 'sidebar';
		var borderContainer = new BorderContainer( {
			'id' : 'borderContainer'+parentTabOrViewId,
			'region' : 'center',
			'design' : design,
			'persist' : true,
			//'class': 'noOverFlow'
			'style' : {width: '100%', height: '100%', overflow: 'hidden', padding: '0px', margin: '0px'}
		});
		var leftPane = new ContentPane( {
			'id' : 'master'+parentTabOrViewId,
			'region' : 'leading',
			'class' : 'backgroundClass',
			'splitter' : true,
			//'class': 'noOverFlow',
			'style' : {width: '200px',overflow: 'hidden',padding: '0px', margin: '0px'}
		});
		var centerPane = new ContentPane( {
			'id' : 'slave'+parentTabOrViewId,
			'region' : 'center',
			'class' : 'backgroundClass',
			//'content' : '<p>Loading...</p>',
			//'class': 'noOverFlow'
			'style' : {overflow: 'hidden',padding: '0px', margin: '0px'}
		});
		borderContainer.addChild(leftPane);
		borderContainer.addChild(centerPane);
		parentContentPane.containerNode.appendChild(borderContainer.domNode); //appendChild works better than attaching through create
		//createAccTabPane(leftPane, 0, parentTabOrViewId);
		//createAccTabPane(centerPane, level+1);
		
		var tabsArr = _nqSchemaMemoryStore.query({parentViewId: parentTabOrViewId, entity: 'tab'});//get the tabs		 
		var accordianContainer;
		if(tabsArr.length==1){// this is really only to have palce to store accTab+parentTabOrViewId. Is there a better way?
			accordianContainer = new ContentPane( {
				'id' : 'acctab'+parentTabOrViewId,
				'region' : 'center',
				'persist' : true
//				'style' : {width: '100%',height: '100%',overflow: 'hidden',padding: '0px', margin: '0px'}
			});
		}
		else {
			accordianContainer = new AccordionContainer( {
				'id' : 'acctab'+parentTabOrViewId,
				'region' : 'center',
				'persist' : true,
				'class': 'noOverFlow'
//				'style' : {width: '100%',height: '100%',overflow: 'hidden',padding: '0px', margin: '0px'}
			});
		}
		leftPane.addChild(accordianContainer);

		dojo.forEach(tabsArr, function(tab) {
			var tabPane = new ContentPane( {
				'id' : 'tab'+tab.id,
				'title' : tab.title,
				'selected' : tab.id==selectedTabId?true:false,
				'class' : 'backgroundClass',
				//'content' : '<p>Loading...</p>',
				'onShow' : function(){
								setHashTabId(level, tab.id); // this will trigger createWidgetProvideData
								//else createWidgetProvideData(level);
							}
			});
			accordianContainer.addChild(tabPane);
			//when we create a tab we can know if we have to create a border container in it. 
			var childTabsArr = _nqSchemaMemoryStore.query({parentViewId: tab.id, entity: 'tab'});//get the tabs
			if(childTabsArr.length>0){
				if(tab.containerType == 'Accordion') createAccordion(tabPane, tab.id, selectedTabId, level);
				else createTabs(tabPane, tab.id, selectedTabId, level);
			}
		});
		borderContainer.startup();
		
	}	
	//////////////////////////////////////////////////////////////////////////////
	// Add a tab container
	//////////////////////////////////////////////////////////////////////////////
	function createTabs(patentPane, parentTabOrViewId, selectedTabId, level){
		var tabsArr = _nqSchemaMemoryStore.query({parentViewId: parentTabOrViewId, entity: 'tab'});//get the tabs		 

		var container;
		if(tabsArr.length==1){// this is really only to have palce to store accTab+viewId. Is there a better way?
			container = new ContentPane( {
				'id' : 'acctab'+parentTabOrViewId,
				'region' : 'center',
				'persist' : true
			});
		}
		else {
			container = new TabContainer( {
				'id' : 'acctab'+parentTabOrViewId,
				'persist' : true,
				'region' : 'center'
			});
		}
		dojo.forEach(tabsArr, function(tab) {
			var tabPane = new ContentPane( {
				'id' : 'tab'+tab.id,
				'title' : tab.title,
				'selected' : tab.id==selectedTabId?true:false,
				'class' : 'backgroundClass',
				'style' : {overflow: 'hidden', padding: '0px', margin: '0px', width: '100%', height: '100%'},
				'onShow' : function(){
								//fullPage.resize();doesn't help
								setHashTabId(level, tab.id); // this will trigger createWidgetProvideData
								//else createWidgetProvideData(level);
							}
			});
			container.addChild(tabPane);
			//when we create a tab we can know if we have to create a border container in it. 
			var childTabsArr = _nqSchemaMemoryStore.query({parentViewId: tab.id, entity: 'tab'});//get the tabs
			if(childTabsArr.length>0){
				if(tab.displayType = 'Sub Accordion'){
					createAccordion(tabPane, tab.id, selectedTabId, level);
				}
				else createTabs(tabPane, tab.id, selectedTabId, level);
			}
		});
		patentPane.addChild(container);
		container.startup();
		if(tabsArr.length>1) container.resize();
	}	
	//////////////////////////////////////////////////////////////////////////////
	// Walk the list of widgets for this tab
	//////////////////////////////////////////////////////////////////////////////
	function createWidgets(level){
		var state = getState(level);
		var widgetsArr = _nqSchemaMemoryStore.query({parentTabId: state.tabId, entity: 'widget'});//get the widgets that belong to this tab
		for(var i=0;i<widgetsArr.length;i++){
			createWidgetProvideData(level, widgetsArr[i]);
		}		
	}
	//////////////////////////////////////////////////////////////////////////////
	// Add the Widget to the Tap Pane and Provide Data For It
	//////////////////////////////////////////////////////////////////////////////
	function createWidgetProvideData(level, widgetDef){
		var state = getState(level);
		if(!state.tabId) return;
		var tabNode = dom.byId('tab'+state.tabId);
		var widget = registry.byId('widget'+widgetDef.id);
		var viewDef = _nqSchemaMemoryStore.get(state.viewId);
		viewsArr = _nqSchemaMemoryStore.query({parentWidgetId: widgetDef.id, entity: 'view'});//get the views that belong to this wdiget	
		var viewIdsArr = [];
		for(var i=0;i<viewsArr.length;i++){
			viewIdsArr.push(viewsArr[i].id);
		}

		switch(widgetDef.displayType){
		case 'Document': 
			if(widget) widget.set('parentId', state.selectedObjectIdPreviousLevel);
			else {
				widget = new nqDocument({
					id: 'widget'+widgetDef.id,
					store: _nqDataStore,
					widgetDef: widgetDef,
					tabId: state.tabId // used by resize
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				//widget.startup();
				widget.set('parentId', state.selectedObjectIdPreviousLevel);
			}
			break;	
		case 'Form': 
			if(widget) widget.set('parentId', state.selectedObjectIdPreviousLevel);
			else {
				widget = new nqForm({
					id: 'widget'+widgetDef.id,
					store: _nqDataStore,
					widgetDef: widgetDef,
					viewDef: viewDef
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup();
				widget.set('parentId', state.selectedObjectIdPreviousLevel);
			}
			break;	
		case 'Report': 
			if(widget) widget.set('parentId', state.selectedObjectIdPreviousLevel);
			else {
				widget = new nqReport({
					id: 'widget'+widgetDef.id,
					store: _nqDataStore,
					widgetDef: widgetDef,
					viewDef: viewDef
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup();
				widget.set('parentId', state.selectedObjectIdPreviousLevel);
			}
			break;	
		case 'Table':
			var query = {parentId: state.selectedObjectIdPreviousLevel, joinViewAttributes: viewIdsArr};
			if(widget){
				var curQuery = widget.get("query");
				if(curQuery.parentId != state.selectedObjectIdPreviousLevel || curQuery.joinViewAttributes != viewIdsArr) widget.set("query", query);
			}
			else {
				widget = new nqTable({
					id: 'widget'+widgetDef.id,
					store: _nqDataStore,
					widgetDef: widgetDef,
					viewDef: viewDef,
					viewsArr: viewsArr,
					level: level, // used by onClick
					query: query
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup();
			}
			break;
		case 'Tree':
			var query;
			if(widgetDef.parentId) query = {'id': widgetDef.parentId};
			else{
				var objId = state.selectedObjectIdPreviousLevel.split('/')[1];
				query = {id: viewsArr[0].id+'/'+objId};
			}
			if(widget){
				var curQuery = widget.model.query;
				if(curQuery.Id != query.Id) {
					widget.destroy();
					widget = null;
				}
			}
			if(!widget)	{
				var treeModel = new nqObjectStoreModel({
					childrenAttr: viewIdsArr,
					store : _nqDataStore,
					query : query
				});
				var widget = new nqTree({
					id : 'widget'+widgetDef.id,
					model: treeModel,
					dndController: dndSource,
					betweenThreshold: 5, 
					persist: 'true',
					viewsArr: viewsArr,
					level: level, // used by onClick
					tabId: state.tabId // used by onClick
				}, domConstruct.create('div'));
				
				widget.onLoadDeferred.then(function(){
					var nextState = getState(level+1);
					if(state.selectedObjId == 824) widget.set('paths', [['846/810','846/2016','846/2020', '846/824']]);
					else if(state.selectedObjId && nextState.viewId) widget.set('selectedItem', nextState.viewId+'/'+state.selectedObjId);	
				});
				tabNode.appendChild(widget.domNode);
				widget.startup();
			}
			break;
		case 'Process Model': 
			if(!widget){
				widget = new nqProcessChart({
					id: 'widget'+widgetDef.id,
					store: _nqDataStore,
					orgUnitRootId: '850/494', // Process Classes
					orgUnitViewId: '1868',
					orgUnitNameAttrId: '1926',
					stateRootId: '2077/443',
					stateViewId: '2077',
					stateNameAttrId: '2081'
					//skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup().then(function(res){
					widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
				});
			}
			else widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
			break;
		case '3D Class Model': 
			if(!widget){
				widget = new nqClassChart({
					id: 'widget'+widgetDef.id,
					store: _nqDataStore,
					XYAxisRootId: '844/67', // Process Classes
					viewId: state.viewId,
					nameAttrId: 852,
					ZYAxisRootId: '844/53', //Attributes
					skyboxArray: [ 'img/Neuralquest/space_3_right.jpg', 'img/Neuralquest/space_3_left.jpg', 'img/Neuralquest/space_3_top.jpg' ,'img/Neuralquest/space_3_bottom.jpg','img/Neuralquest/space_3_front.jpg','img/Neuralquest/space_3_back.jpg']
				}, domConstruct.create('div'));
				tabNode.appendChild(widget.domNode);
				widget.startup().then(function(res){
					widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
				});
			}
			else widget.setSelectedObjectId(state.selectedObjectIdPreviousLevel);
			break;
		}
	}
	//////////////////////////////////////////////////////////////////////////////
	//Helpers
	//////////////////////////////////////////////////////////////////////////////
	lang.setObject("nq.getState", getState);//make the function accessable from inline script
	function getState(level){
		var hashArr = hash().split('.');
		return {
			viewId: hashArr[level*3+0],
			tabId: hashArr[level*3+1],
			selectedObjId: hashArr[level*3+2],
			selectedObjectIdPreviousLevel: hashArr[level*3+0]+'/'+hashArr[level*3-1]
		};
	}
	function setHashTabId(level, tabId){
		var hashArr = hash().split('.');
		if(hashArr[level*3+1] == tabId) return;
		hashArr[level*3+1] = tabId;
		
		var viewsArr = _nqSchemaMemoryStore.query({parentTabId: tabId, entity: 'view'});//get the views		 
		if(viewsArr.length>0) hashArr[(level+1)*3+0] = viewsArr[0].id;
		else hashArr = hashArr.slice(0,level*3+2);

		//remove anything following this tab in the hash since it is nolonger valid
		hashArr = hashArr.slice(0,level*3+2);
		var newHash = hashArr.join('.');
		//newHash = newHash.replace(/,/g,'.');
		hash(newHash, true);// update history, instead of adding a new record			
	}
});
