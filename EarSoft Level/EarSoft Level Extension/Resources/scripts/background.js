chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	
	switch (request.type) {
		case 'tab_level_status': 
			if (request.control_available) {
				chrome.browserAction.enable(sender.tab.id);
			} else {
				chrome.browserAction.disable(sender.tab.id);
			}
			break;
			
		case 'broadcast_state_bgpage':
			chrome.tabs.query({}, function(tabs) {
				for (var i=0; i < tabs.length; i++) {
					if (tabs[i].id != sender.tab.id) {
						chrome.tabs.sendMessage(tabs[i].id, {type: 'broadcast_state', state: request.state});
					}
				}
			});
			break;
			
		case 'check_active_tab':
			chrome.windows.getLastFocused({}, function(w) {
				send_active_tab_change(w.id);
			});
			
			break;
	}
	
});

function send_active_tab_change(windowId) {

	if (windowId == chrome.windows.WINDOW_ID_NONE) {
		return;
	}
	
	chrome.tabs.query({}, function(tabs) {
		for (var i=0; i < tabs.length; i++) {
			chrome.tabs.sendMessage(tabs[i].id, {
				type: 'active_tab_changed', 
				active_window: windowId == tabs[i].windowId,
				active_tab: tabs[i].active
			});
		}
	});
}

chrome.tabs.onActivated.addListener(function(info) {
	send_active_tab_change(info.windowId);
});

chrome.windows.onFocusChanged.addListener(send_active_tab_change);

chrome.tabs.onUpdated.addListener(function(tab) {
	// catch url changes, so that the browserAction status gets updated as well
	chrome.tabs.sendMessage(tab, {type: 'force_tag_update'});
});


var _timer_avg = null;
var _timer_range = null;

chrome.storage.onChanged.addListener(function(changes) {
	if (changes['control_state']) {
		if (changes['control_state'].newValue.average) {
			var old_avg = changes['control_state'].oldValue.average || 999;
				old_avg = Math.round(old_avg);
			var new_avg = Math.round(changes['control_state'].newValue.average);

			if (old_avg != new_avg) {
				clearTimeout(_timer_avg);
				_timer_avg = setTimeout(function() {
				//	console.log('Average:', new_avg);
					_gaq.push(['_trackEvent', 'level', 'changed', 'average', new_avg]);
				}, 5000);				
			}
		}
		
		if (changes['control_state'].newValue.range) {
			var old_range = changes['control_state'].oldValue.range || 999;
				old_range = Math.round(old_range);
			var new_range = Math.round(changes['control_state'].newValue.range);

			if (old_range != new_range) {
				
				clearTimeout(_timer_range);
				_timer_range = setTimeout(function() {
				//	console.log('Range:', new_range);
					_gaq.push(['_trackEvent', 'level', 'changed', 'range', new_range]);
				}, 5000);
			}
		}
	}
});

chrome.runtime.onInstalled.addListener(function(e) {
    chrome.tabs.create({url: chrome.extension.getURL('help.htm')});
});

chrome.browserAction.disable();
