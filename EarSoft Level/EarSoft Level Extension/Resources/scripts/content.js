level_attachments = {
	audio_context: null,
	level_control_instance: null,
	level_audio_instance: null,
	count: -1,
	broadcast: true,
	solo: false,
	bypass: false,
	frame_size: 4096,
	tagAssocData: [],
	
	init: function() {
		this.updateSettings((function(){
			this.initLevelControl();
			this.bindSettings();	
			this.observe(document.getElementsByTagName('body')[0]);
			this.updateTags(true);
		}).bind(this));		
	},
	
	initLevelControl: function() {
		if (!this.level_control_instance) {
			this.level_control_instance = new LevelControlApi({
				onInitialise: (function() {
					this.updateSettings(null);							
				}).bind(this),						
				
				onMessageToAudio: (function(msg) {
					if (this.level_audio_instance) {
						this.level_audio_instance.handleMessageFromControl(msg);
					}
				}).bind(this),

				onMessageToDisplay: function(msg) {
					if (!document.hidden) {
						chrome.runtime.sendMessage({
							type: 'msg_control_to_display', 
							msg: Array.apply(null, msg)
						});
					}
				},
				
				onControlUpdate: (function(state, average, range, preset, muted) {
					if (!document.hidden) {
						var tmp = Array.apply(null, state);
						chrome.storage.local.set({
							'control_state': {
								raw: tmp, 
								average: average,
								range: range,
								preset: preset,
								muted: muted
							}
						});

						// this wouldn't be necessary if we could avoid state loopbacks
						if (this.broadcast) {
							chrome.runtime.sendMessage({
								type: 'broadcast_state_bgpage', 
								state: tmp
							});
						}
					}
				}).bind(this)
			});			
				
			this.sendTabStatus();			
			chrome.runtime.onMessage.addListener(this.onRuntimeMessage.bind(this));
		}
	},
	
	initLevelAudio: function() {
		if (!this.audio_context) {
			this.audio_context = new (window.AudioContext || window.webkitAudioContext)();
		}
		
		if ( (this.audio_context) && (!this.level_audio_instance) ) {

			var wf = (typeof LevelAudioThreadedApi !== 'undefined') ? chrome.runtime.getURL('level-api/api-release.js') : '';
			this.level_audio_instance = new LevelAudioApi({
				workerFile: wf,
				onMessageToControl: this.level_control_instance.handleMessageFromAudio.bind(this.level_control_instance)
			});
			
			this.level_audio_instance.bypassEffect(this.bypass);
		}
	},
	
	bindSettings: function() {		
		chrome.storage.onChanged.addListener((function(changes) {
			for (key in changes) {
				this.onSettingsChanged(key, changes[key].newValue, false);
			}
		}).bind(this));
		
		this.updateSettings();
	},
	
	updateSettings: function(func) {	
		chrome.storage.local.get(null, (function(items) {
			for (key in items) {
				this.onSettingsChanged(key, items[key], true);
			}
			if (func) {
				func();
			}
		}).bind(this));		
	},
	
	updateTags: function(force) {
		var sources = [
			document.getElementsByTagName('video'),
			document.getElementsByTagName('audio')
		];
		
		var new_count = 0;
		var new_attachment = false;
		for(var s = 0; s < 2; s++) {			
			var source = sources[s];
			for(var t = 0; t < source.length; t++) {
				new_attachment |= this.attachToTag(source[t]);
			}
			new_count += source.length;
		}

		if ( (force) || (new_count != this.count) || (new_attachment) ) {
			this.count = new_count;
			this.sendTabStatus();
		}
		
		if (this.count>0) {
			console.log('Level connected to ' + this.count + ' Media elements');
		}
	},
	
	attachToTag: function(tag) {
		var assoc_data = {
			src: null,
			fs: null
		};
		
		var level_assoc = tag.getAttribute('level-assoc');
		if (level_assoc !== null) {
			var tmp_assoc_data = this.tagAssocData[parseInt(level_assoc)];
			if (tmp_assoc_data) {
				assoc_data = tmp_assoc_data;
				
				if ( (assoc_data.fs) && (assoc_data.fs == this.frame_size) ) {
					return;
				}
			}
		} else {
			level_assoc = this.tagAssocData.push(assoc_data) - 1;
			tag.setAttribute('level-assoc', level_assoc.toString());
		}
		
		this.initLevelAudio();
		if (!this.level_audio_instance) {
			return false;
		}

		if (!assoc_data.src) {
			assoc_data.src = this.audio_context.createMediaElementSource(tag);
		}

		if ( (!assoc_data.fs) || (assoc_data.fs != this.frame_size) ) {
			assoc_data.fs = this.frame_size;
			this.level_audio_instance.connectEffect(assoc_data.src, this.audio_context.destination, this.frame_size);
		}
		
		return true;
	}, 
	
	observe: function(obj) {
		if (window.MutationObserver) {
			this.mutObserver = new window.MutationObserver((function(mutations, observer) {
		
				var skip = false;
				for (var i = 0; i < mutations.length; i++) {
					var m = mutations[i];
					for (var n = 0; n < m.addedNodes.length; n++) {
						if ( (m.addedNodes[n].nodeName === 'VIDEO') || (m.addedNodes[n].nodeName === 'AUDIO') ) {
							this.updateTags(false);
							skip = true;
							break;
						}
					}
					if (skip) break;

					for (var n = 0; n < m.removedNodes.length; n++) {
						if ( (m.removedNodes[n].nodeName === 'VIDEO') || (m.removedNodes[n].nodeName === 'AUDIO') ) {
							this.updateTags(false);
							skip = true;
							break;
						}
					}
					if (skip) break;
				}
				
				//this.updateTags(false);
				
			}).bind(this));
			
			this.mutObserver.observe(obj, {
				childList : true,
				subtree : true
			});
		} else if (window.addEventListener) {
			obj.addEventListener('DOMNodeInserted', (function() {this.updateTags(false);}).bind(this));
			obj.addEventListener('DOMNodeRemoved', (function() {this.updateTags(false);}).bind(this));
		}
	},
	
	onRuntimeMessage: function(request, sender, sendResponse) {
		switch(request.type) {
			case 'msg_display_to_control':			
				this.level_control_instance.handleMessageFromDisplay(new Uint8Array(request.msg));
				break;

			case 'control_func_call':
				this.level_control_instance.forwardFunctionCall(request.func, request.params);
				break;

			case 'force_control_sync':
				// this forces control to send out update messages with the current state
				this.level_control_instance.changeRange(0, false);
				break;

			case 'force_tag_update':
				this.updateTags(true);				
				break;
				
			case 'broadcast_state':
				if (this.broadcast) {
					this.level_control_instance.setState(request.state, false);
				}
				break;
				
			case 'active_tab_changed':
				if (this.solo) {
					if ( (request.active_tab) && (request.active_window) ) {
						this.level_control_instance.unMute();
					} else {
						this.level_control_instance.mute();
					}
				}				
				break;
		}
	},
	
	onSettingsChanged: function(key, value, force_update) {
		switch(key) {
			case 'broadcast':
				this.broadcast = value;
				break;
			
			case 'solo':
				this.solo = value;
				if (this.level_control_instance) {
					if (value) {
						chrome.runtime.sendMessage({type: 'check_active_tab'});
					} else {
						this.level_control_instance.unMute();
					}
				}
				break;
			
			case 'bypass':
				this.bypass = value;
				if (this.level_audio_instance) {
					this.level_audio_instance.bypassEffect(this.bypass);
				}
				
				if (this.level_control_instance) {
					if (!value) {
						chrome.runtime.sendMessage({type: 'check_active_tab'});
					} else {
						this.level_control_instance.unMute();
					}
				}
				break;
			
			case 'control_state':
				if ( (force_update) && (this.level_control_instance) && (value) && (value.raw)) {
					this.level_control_instance.setState(value.raw, false);
				}
				break;

			case 'frame_size':
				if (this.frame_size != value) {
					this.frame_size = value;

					if (this.level_audio_instance) {
						this.updateTags(true);
						//this.level_audio_instance.updateFrameSize(this.frame_size);
					}
				}
				
				break;
		}
	},
	
	sendTabStatus: function() {
		chrome.runtime.sendMessage({
			type: 'tab_level_status', 
			control_available: !!this.level_control_instance,
			audio_count: this.count
		});
	}
};


document.addEventListener('DOMContentLoaded', function(e) {
	level_attachments.init();
}, false);