ControlField = Ext.extend(Ext.form.TextField, {
	emptyText : '<field>',
	fieldClass: 'control_field',
	readOnly: true
});
Ext.reg('controlfield', ControlField);

ValueMetaAndData = Ext.extend(Object, {
	constructor: function(cfg) {
		this.name = 'constant';
		Ext.apply(this, cfg);
	},
	toString: function() {
		
		return app.syncCall({
            url: "system/valueString.do",    
            params: {valueMeta: Ext.encode(this)}
        });
		
	}
});

Condition = Ext.extend(Ext.util.Observable, {
	constructor: function(config){
		this.operator = 0;
		this.list = [];
		
		this.negate = false;
		this.left_valuename = null;
		this.func = 0;
		this.right_valuename = null;
		this.right_exact = null;
		
		Ext.apply(this, config);
		if(config.conditions) {
			delete this.conditions;
			
			for(var i=0; i<config.conditions.length; i++) {
				var c = new Condition(config.conditions[i]);
				this.list.push(c);
			}
		}
		if(config.right_exact) {
			delete this.right_exact;
			this.right_exact = new ValueMetaAndData(config.right_exact);
		}
		
		this.operators =  [ "-", "OR", "AND", "NOT", "OR NOT", "AND NOT", "XOR" ];
		this.functions = ["=", "<>", "<", "<=", ">", ">=", "REGEXP", "IS NULL", "IS NOT NULL", 
			"IN LIST", "CONTAINS", "STARTS WITH", "ENDS WITH", "LIKE", "TRUE"];
		
		this.addEvents({
			"fired" : true,
			"quit" : true
		});

		// Call our superclass constructor to complete construction process.
		Condition.superclass.constructor.call(this, config);
	},
	
	getValue: function() {
		var value = {};
		value.negate = this.negate;
		value.operator = this.operator;
		value.conditions = [];
		Ext.each(this.list, function(c) {
			value.conditions.push(c.getValue());
		});
		value.left_valuename = this.left_valuename;
		value.func = this.func;
		value.right_valuename = this.right_valuename;
		if(this.right_exact != null) {
			value.right_exact = Ext.encode(this.right_exact);
		}
		
		return value;
	},
	
	addCondition: function(cb) {
		 if ( this.isAtomic() && this.getLeftValuename() != null ) {
		  
			var current = new Condition();
			current.left_valuename = this.left_valuename;
			current.func = this.func;
			current.right_valuename = this.right_valuename;
			current.negate = this.negate;
			this.negate = false;
		
			this.list.push( current );
		} else {
			if ( this.list.length > 0 && cb.getOperator() == 0 ) {
				cb.setOperator( 2 );
			}
		}
		this.list.push( cb );
	},
	
	removeCondition: function( nr ) {
		var list = this.list;
		if ( list.length > 0 ) {
			var c = list[nr];
			list.splice( nr, 1 );

			var moveUp = this.isAtomic() || list.length == 1;
			if ( list.length == 1 ) {
				c = list[0];
			}

			if ( moveUp ) {
				this.left_valuename = c.left_valuename;
				this.func = c.func;
				this.right_valuename = c.right_valuename;
				this.negate = this.isNegated() ^ c.isNegated();
			}
		}
	},

	isAtomic: function() {
		return this.list.length == 0;
	},
	
	isNegated: function() {
		return this.negate;
	},
	
	setNegated: function(negate) {
		this.negate = negate;
	},
	
	setOperator: function(op) {
		this.operator = op;
	},
	
	getOperatorDesc: function() {
		return this.operators[this.operator];
	},
	
	getFunctionDesc: function() {
		return this.functions[this.func];
	},
	
	setFunc: function(f) {
		this.func = f;
	},
	
	getFunc: function(desc) {
		if(!desc) return this.func;
		
		var fs = this.functions;
		for(var i=0; i<fs.length; i++)
			if(fs[i] == desc)
				return i;
		return 0;
	},
	
	getFunctions: function() {
		var m = [];
		for(var i=0; i<this.functions.length; i++)
			m.push({name: this.functions[i]});
		return m;
	},
	
	nrConditions: function() {
		return this.list.length;
	},
	
	getCondition: function(i) {
		return this.list[i];
	},
	
	getLeftValuename: function() {
		return this.left_valuename;
	},
	
	setLeftValuename: function( left_valuename ) {
	    this.left_valuename = left_valuename;
	},
	
	setRightValuename: function( right_valuename ) {
	    this.right_valuename = right_valuename;
	},

	getRightValuename: function() {
	    return this.right_valuename;
	},
	
	setRightExact: function( right_exact ) {
	    this.right_exact = right_exact;
	},
	
	getRightExactString: function() {
		if(this.right_exact == null)
			return null;
		
		return this.right_exact.toString();
	},
	
	getOperator: function() {
		return this.operator;
	},
	
	toString: function(level, show_negate, show_operator) {
		level = level ? level : 0;
		show_negate = show_negate ? true : false;
		show_operator = show_operator ? true : false;
		
		var retval = '';
		if ( this.isAtomic() ) {
			for ( var i = 0; i < level; i++ ) {
				retval += '&nbsp;&nbsp;';
			}
			
			if ( show_operator && this.operator != 0 ) {
				retval += this.getOperatorDesc() + "&nbsp;&nbsp;";
			} else {
				retval += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
			}

			// Atomic is negated?
			if ( this.isNegated() && ( show_negate || level > 0 ) ) {
				retval += "NOT (";
			} else {
				retval += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
			}

			if ( this.func == 14 ) {
				retval += " TRUE";
			} else {
				retval += this.left_valuename + " " + this.getFunctionDesc();
				if ( this.func != 7 && this.func != 8 ) {
					if ( this.right_valuename != null ) {
						retval += "&nbsp;" + this.right_valuename;
					} else {
						var rightExactString = this.getRightExactString();
						retval += "&nbsp;[" + ( rightExactString == null ? "" : rightExactString ) + "]";
					}
				}
			}

			if ( this.isNegated() && ( show_negate || level > 0 ) ) {
				retval += ")";
			}
			
			retval += '<br>';
		} else {

			// Group is negated?
			if ( this.isNegated() && ( show_negate || level > 0 ) ) {
				for ( var i = 0; i < level; i++ ) {
					retval += "&nbsp;&nbsp;";
				}
				retval += "NOT" + '<br>';
			}
			// Group is preceded by an operator:
			if ( this.operator != 0 && ( show_operator || level > 0 ) ) {
				for ( var i = 0; i < level; i++ ) {
					retval += "&nbsp;&nbsp;";
				}
				retval += this.getOperatorDesc() + "<br>";
			}
			for ( var i = 0; i < level; i++ ) {
				retval += "&nbsp;";
			}
			retval += "(" + "<br>";
			for ( var i = 0; i < this.list.length; i++ ) {
				var cb = this.list[i];
				retval += cb.toString( level + 1, true, i > 0 );
			}
			for ( var i = 0; i < level; i++ ) {
				retval += "&nbsp;&nbsp;";
			}
			retval += ")" + '<br>';;
		}
		
		return retval;
	}
});

ConditionEditor = Ext.extend(Ext.Container, {
	
	constructor: function(config) {
		var c = config.value ? Ext.decode(config.value) : {};
		
		this.active_condition = new Condition(c);
		this.parents = [];
		ConditionEditor.superclass.constructor.call(this, config);
	},
	
	onLayout : function(){
		
		var first = this.el.first();
		if(first) first.remove();
		
		var template = new Ext.Template([
			'<table class="ConditionEditor">',
				'<tr>',
					'<td>',
						'<table>',
							'<tr class="control_area">',
								'<td><div class="not_field"></div></td>',
								'<td><div class="add_field"></div></td>',
							'</tr>',
						'</table>',
					'</td>',
				'</tr>',
				'<tr>',
					'<td>',
						'<table class="tableBody">',
						'</table>',
					'</td>',
				'</tr>',
			'</table>']);
		template.append(this.el, {});
		
		var active_condition = this.active_condition;
		if ( active_condition.isAtomic() ) {
			this.drawAtomic();
		} else {
			for(var i=0; i<active_condition.nrConditions(); i++) {
				var condition = active_condition.getCondition(i);
				this.drawCondition(i, condition);
			}
		}
		
		if(this.parents.length > 0) {
			var controlArea = this.el.child('tr.control_area', true);
			var template = new Ext.Template(['<td><div class="up_field"></div></td>',
				'<td><div class="conditions_tip">级别' + this.parents.length+ '，选择《向上》到上一级</div></td>']);
			template.append(controlArea, {});
		}
		
		this.initControls();
	},
	
	drawAtomic: function() {
		var tableBody = this.el.child('table.tableBody', true);
		var template = new Ext.Template([
			'<tr>',
				'<td align="right"><div class="left_field"></div></td>',
				'<td><div class="func_field"></div></td>',
				'<td><div class="right_field"></div></td>',
			'</tr>','<tr>',
				'<td>&nbsp;</td>',
				'<td>&nbsp;</td>',
				'<td><div class="value_field"></div></td>',
			'</tr>'
		]);
		template.append(tableBody, {});
	},
	
	drawCondition: function(i, condition) {
		var string = condition.toString(0, true, false);
		var tableBody = this.el.child('table.tableBody', true);
		var fragment = [];
		if(i > 0) {
			fragment.push('<tr><td align="left" colspan="2"><span class="list-operation">', condition.getOperatorDesc(), '</span></td></tr>');
		}
		fragment.push('<tr>',
			'<td align="left"><span class="list-condition" index="' + i + '">', string, '</span></td>',
			'<td><a class="delete_field" href="javascript:void(0);" index="' + i + '">删除</a></td>',
		'</tr>');
		var template = new Ext.Template(fragment);
		template.append(tableBody, {});
	},
	
	addCondition: function() {
		var c = new Condition();
		c.setOperator( 2 );
		
		this.active_condition.addCondition( c );
	},
	
	editCondition: function(i) {
		var active_condition = this.active_condition;
		if ( !active_condition.isAtomic() ) {
			this.parents.push( active_condition );
			this.active_condition = active_condition.getCondition( i );
			
			this.doLayout();
		}
	},
	
	goUp: function() {
		var parents = this.parents;
		if ( parents.length > 0 ) {
			this.active_condition = parents.pop();

			this.doLayout();
		}
	 },
	
	initControls: function() {
		var not = this.el.child('div.not_field', true);
		var me = this, active_condition = this.active_condition;
		
		if(not) {
			var notControl = new ControlField({
				width: 70,
				value: 'NOT',
				renderTo: not
			}); 
			
			if(active_condition.isNegated())
				notControl.getEl().addClass('control_field_overCls');
			
			notControl.getEl().on('click', function() {
				active_condition.setNegated(!active_condition.isNegated());
				if(active_condition.isNegated()) {
					notControl.getEl().addClass('control_field_overCls');
				} else {
					notControl.getEl().removeClass('control_field_overCls');
				}
			});
		}
		
		var up = this.el.child('div.up_field', true);
		if(up) {
			var upControl = new ControlField({
				width: 80,
				value: '^^ 向上 ^^',
				renderTo: up
			});
			
			upControl.getEl().on('click', function() {
				me.goUp();
			});
		}
			
		var add = this.el.child('div.add_field', true);
		if(add) {
			var addControl = new ControlField({
				width: 80,
				value: '新增条件',
				renderTo: add
			});
			
			addControl.getEl().on('click', function() {
				me.addCondition();
				me.doLayout();
			});
		}	
			
		var left = this.el.child('div.left_field', true);
		if(left) {
			var leftControl = new ControlField({
				width: 120,
				value: active_condition.left_valuename,
				renderTo: left
			});
			
			leftControl.getEl().on('click', function() {
				var dialog = new EnterSelectionDialog();
				dialog.on('sure', function(v) {
					active_condition.setLeftValuename(v);
					leftControl.setValue(v);
				});
				dialog.show();
			});
		}
		
		var func = this.el.child('div.func_field', true);
		if(func) {
			var funcControl = new ControlField({
				width: 80,
				emptyText: '=',
				value: active_condition.getFunctionDesc(),
				renderTo: func
			});
			
			funcControl.getEl().on('click', function() {
				var dialog = new EnterSelectionDialog({
					title: '函数',
					getExtraStore: function() {
						var store = new Ext.data.JsonStore({
							fields: ['name'],
							data: active_condition.getFunctions()
						});
						return store;
					}
				});
				dialog.on('sure', function(v) {
					var rawv = active_condition.getFunc(v);
					active_condition.setFunc(rawv);
					funcControl.setValue(v);
				});
				dialog.show();
			});
		}
		
		var right = this.el.child('div.right_field', true);
		if(right) {
			var rightControl = new ControlField({
				width: 120,
				value: active_condition.right_valuename,
				renderTo: right
			});
			if(active_condition.getFunc() == 7 || active_condition.getFunc() == 8)
				rightControl.setValue('-');
			
			rightControl.getEl().on('click', function() {
				var dialog = new EnterSelectionDialog();
				dialog.on('sure', function(v) {
					active_condition.setRightValuename(v);
					active_condition.setRightExact( null );
					rightControl.setValue(v);
					
					me.doLayout();
				});
				dialog.show();
			});
		}
		
		var value = this.el.child('div.value_field', true);
		if(value) {
			var valueControl = new ControlField({
				width: 120,
				emptyText: '<value>',
				value: active_condition.getRightExactString(),
				renderTo: value
			});
			
			if(active_condition.getFunc() == 7 || active_condition.getFunc() == 8) valueControl.setValue('-');
			
			valueControl.getEl().on('click', function() {
				var dialog = new EnterValueDialog();
				dialog.on('sure', function(v) {
					active_condition.setRightValuename( null );
	                active_condition.setRightExact( v );
	                
	                me.doLayout();
				});
				dialog.show();
			});
		}
		
		var allOperations = this.el.select('span.list-operation');
		allOperations.each(function(op) {
			op.addClassOnOver('list-operation-overCls');
		});
		
		var allConditions = this.el.select('span.list-condition');
		allConditions.each(function(op) {
			op.addClassOnOver('list-condition-overCls');
			op.on('click', function(e, dom) {
				var index = parseInt(dom.getAttribute('index'));
				me.editCondition(index);
			});
		});
		
		var allDeleteControls = this.el.select('a.delete_field');
		allDeleteControls.each(function(op) {
			op.on('click', function(e, dom) {
				var index = parseInt(dom.getAttribute('index'));
				active_condition.removeCondition(index);
				me.doLayout();
			});
		});
		
	},
	
	getValue: function() {
		var top_condition = this.parents.length > 0 ? this.parents[0] : this.active_condition;
		return top_condition.getValue();
	}
	
});