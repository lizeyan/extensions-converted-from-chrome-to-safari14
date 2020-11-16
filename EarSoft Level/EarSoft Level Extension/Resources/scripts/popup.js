level_popup = {
	level_display_instance: null,
	window_id: -1,
	audio_count: 0,
	
	init: function(winId) {
		this.window_id = winId;
		this.canvas = $('#level');
		this.solo = $('#cb_solo');
		this.broadcast = $('#cb_all');
		this.bypass = $('#cb_bypass');
		this.level_disabled = $('#level_disabled');
		this.frame_size_select = $('select[name=frame_size]');
		
		this.initSettings();
		this.bindUserInterface();
		
		// check for WebGL support
		var gl; 
		try {
			gl = $('#level').get(0).getContext('webgl');
		} catch (x) {
			gl = null;
		}

		if (!gl) {
			try { 
				gl = $('#level').get(0).getContext('experimental-webgl');
			} catch (x) { 
				gl = null; 
			}
		}
		
		if (!gl) {
			$('#no_webgl').show();
			$('#level').hide();
		} else {
			this.initLevelDisplay();
		}		
		
		chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));
		chrome.windows.onFocusChanged.addListener((function(w) {
			if ( (w>=0) && (w != this.window_id) ) {
//				this.close();
			}
		}).bind(this));

		this.sendMessageToTab({type: 'force_tag_update'});
	},
	
	initLevelDisplay: function() {
		this.level_display_instance = new LevelDisplayApi({
			canvas: this.canvas.get(0),
			keyboardContainer: window,
			onMessageToControl: (function(msg) {
									var msg2 = Array.apply(null, msg);
									this.sendMessageToTab({type: 'msg_display_to_control', msg: msg2});
								}).bind(this),
			onControlFuncCall: (function(func, params) {
									this.sendMessageToTab({type: 'control_func_call', func: func, params: params});
								}).bind(this)
								
		});
	},
	
	initSettings: function() {
		chrome.storage.onChanged.addListener((function(changes) {
			for (key in changes) {
				this.onSettingsChanged(key, changes[key].newValue, false);
			}
		}).bind(this));
		
		chrome.storage.local.get(null, (function(items) {
			for (key in items) {
				this.onSettingsChanged(key, items[key], true);
			}
		}).bind(this));
	},
	
	bindUserInterface: function() {
		this.broadcast.on('change', (function(e) {
			var broadcasting = this.broadcast.is(':checked');
			chrome.storage.local.set({'broadcast': broadcasting});
			
			if (broadcasting) {
				// force sync state
				this.sendMessageToTab({type: 'force_control_sync'});
			}
			
		}).bind(this));
		
		this.solo.on('change', (function(e) {
			var solo = this.solo.is(':checked');
			chrome.storage.local.set({'solo': solo});
		}).bind(this));
		
		this.bypass.on('change', (function(e) {
			var bypass = this.bypass.is(':checked');
			chrome.storage.local.set({'bypass': bypass});
		}).bind(this));
		
		$('#help_link').on('click', (function(e) {
			e.preventDefault();
			chrome.tabs.create({
				url: chrome.extension.getURL('help.htm')
		   });
		}).bind(this));
		
		$('#settings_link').on('click', function(e) {
			e.preventDefault();
			$('#settings').slideToggle(500, function() {
				$('#settings_link .iconfont.arrow').removeClass('icon-arrow-up icon-arrow-down')
					.addClass(($('#settings:visible').length) ? 'icon-arrow-up' : 'icon-arrow-down');

			});
		});
		
		this.frame_size_select.on('change', function() {
			chrome.storage.local.set({
				frame_size: $(this).val()
			});
		});
		
		this.level_disabled.on('mousedown',function(e) {e.preventDefault();});
	},
	
	onSettingsChanged: function(key, value, initialising) {
		switch (key) {
			case 'broadcast':
				this.broadcast.prop('checked', value);
				break;
				
			case 'solo':
				this.solo.prop('checked', value);
				break;
			
			case 'bypass':
				this.bypass.prop('checked', value);
				this.updatePopupState();
				
				if (value) {
					this.solo.prop('disabled', true).parent().addClass('disabled');
					this.level_disabled.fadeIn(500);
				} else {
					this.solo.prop('disabled', false).parent().removeClass('disabled');
					this.level_disabled.fadeOut(500);
				}
				break;
				
			case 'frame_size':
				this.frame_size_select.val(value);
				break;
		}
	},
	
	onRuntimeMessage: function(request, sender, sendResponse) {
		if ( (!sender.tab.active) || (this.window_id != sender.tab.windowId) ){
			return;
		}

		switch (request.type) {
			case 'msg_control_to_display':				
				if (this.level_display_instance) {
					var msg = new Uint8Array(request.msg);
					this.level_display_instance.handleMessageFromControl(msg);
				}
				break;

			case 'tab_level_status': 
				if (!request.control_available) {
					this.close();
				}
				this.audio_count = request.audio_count;
				this.updatePopupState();				

				break;
		}		
	},
	
	updatePopupState: function() {
		if ( (this.audio_count > 0) && (!this.bypass.is(':checked')) ){
			this.canvas.css('opacity', 1);
		} else {			
			this.canvas.css('opacity', 0.1);
		}
		$('#notice .no_html5').toggle(this.audio_count < 1);
	},

	sendMessageToTab: function(msg) {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			for (var i=0; i < tabs.length; i++) {
				chrome.tabs.sendMessage(tabs[i].id, msg);
			}
		});
	},
		
	close: function() {
		window.close();
	}
};

$(function() {
	chrome.windows.getCurrent(function(win){
		level_popup.init(win.id);
	});	
});