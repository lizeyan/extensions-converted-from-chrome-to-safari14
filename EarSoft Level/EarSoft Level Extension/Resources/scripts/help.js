level_help = {
	controlInstance: null,
	displayInstance: null,
	fadeTime: 250,
	autoStepDelay: 1000,

	init: function() {
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

		$('#no_webgl').toggle(!gl);
		$('.level_container,.step_desc,.step_nav,.intro,.step_title').toggle(!!gl);
		
		if (gl) {		
			this.controlInstance = new LevelControlApi({
				onMessageToAudio: function(msg) {},
				onMessageToDisplay: $.proxy(function(msg) {
					if (this.displayInstance) {
						this.displayInstance.handleMessageFromControl(msg);
					} 
				}, this),

				onInitialise: $.proxy(function() {this.resetLevelControl(1);}, this),
				onControlUpdate: function(state, average, range, preset, muted) {
					var v = Math.min(1, Math.max(0, 1+(average+10)/63));
					var op_offset = 0.075;
					var op_l = op_offset + (1-v)*(1-op_offset);
					var op_r = op_offset +    v *(1-op_offset);

					if (muted) {
						$('.level_container .icon-silent').removeClass('icon-silent').addClass('icon-muted');	
					} else {
						$('.level_container .icon-muted').removeClass('icon-muted').addClass('icon-silent');	
					}
					$('.level_container .icon-silent').css('opacity', op_l);
					$('.level_container .icon-loud').css('opacity', op_r);
				}
			});

			this.displayInstance = new LevelDisplayApi({
				canvas:				$('#level').get(0),
				keyboardContainer:	window,
				onMessageToControl: this.controlInstance.handleMessageFromDisplay.bind(this.controlInstance),

				onControlFuncCall:	$.proxy(function(func, params) {
										if (func == 'touchStart') {

											this.startPreset = this.controlInstance.getPreset();
											this.startAverage = this.controlInstance.getAverage();
											this.controlInstance.forwardFunctionCall(func, params);

										} else if (func == 'touchEnd') {

											this.controlInstance.forwardFunctionCall(func, params);
											var a = this.controlInstance.getAverage();
											var p = this.controlInstance.getPreset();
											var step = this.getCurrentStepNr();

											if ( (step == 1) && (a < this.startAverage) ) {
												this.stepDone();
											}

											if ( (step == 2) && (a > this.startAverage) ) {
												this.stepDone();
											}

											if ( (step == 3) && ( (p != this.startPreset) && (p == 2) ) ) {
												this.stepDone();
											}

											if ( (step == 4) && ( (p != this.startPreset) && (p == 0) ) ) {
												this.stepDone();
											}

										} else {
											return this.controlInstance.forwardFunctionCall(func, params);
										}

									}, this),

				onValidKeyShortcut:	$.proxy(function(keyCode) {
										if ($('.level_disabled:visible').length) {
											return;
										}
										
										if ( (this.getCurrentStepNr() == 1) && (keyCode == 37)) {
											this.stepDone();
										}
										if ( (this.getCurrentStepNr() == 2) && (keyCode == 39)) {
											this.stepDone();
										}
										if (this.getCurrentStepNr() == 3) {
											switch(keyCode) {
												case 38:
												case 51:
												case 99:
												case 52:
												case 100:
													this.stepDone();
													break;
											}
										}
										if (this.getCurrentStepNr() == 4) {
											switch(keyCode) {
												case 40:
												case 49:
												case 97:
												case 50:
												case 98:
													this.stepDone();
													break;
											}
										}
					
										if (this.getCurrentStepNr() == 5) {

											switch(keyCode) {
												// left/right arrow
												case 37:
												case 39: 				
													$('#shortcuts .arrow_lr .key_checked').removeClass('hidden');
													break;

												// up/down arrow
												case 38:
												case 40:
													$('#shortcuts .arrow_ud .key_checked').removeClass('hidden');
													break;

												// 1 or numpad 1
												case 49:
												case 97:
													$('#shortcuts .one .key_checked').removeClass('hidden');
													break;

												// 2 or numpad 2
												case 50:
												case 98:
													$('#shortcuts .two .key_checked').removeClass('hidden');
													break;

												// 3 or numpad 3
												case 51:
												case 99:
													$('#shortcuts .three .key_checked').removeClass('hidden');
													break;

												// 4 or numpad 4
												case 52:
												case 100:			
													$('#shortcuts .four .key_checked').removeClass('hidden');
													break;

												// m
												case 77:
													$('#shortcuts .mute .key_checked').removeClass('hidden');
													break;
											}

											//if (!$('#shortcuts .entry:has(.key_checked.hidden)').length) {
											//	this.stepDone();
											//}
										}
									}, this)
			});
		
			this.bindPresets();
			this.bindStepNavigation();
		}
		
		this.bindFooterScroll();
	},

	bindPresets: function() {
		$('#presets .silence').on('click', $.proxy(function(e) {
			e.preventDefault();
			if (this.controlInstance) {
				this.controlInstance.mute();
			}
		}, this));
		$('#presets .neighbours').on('click', $.proxy(function(e) {
			e.preventDefault();
			if (this.controlInstance) {
				this.controlInstance.unMute();
				this.controlInstance.setAverage(-50);
				this.controlInstance.setRange(20);
			}
		}, this));
		$('#presets .noise').on('click', $.proxy(function(e) {
			e.preventDefault();			
			if (this.controlInstance) {
				this.controlInstance.unMute();
				this.controlInstance.setAverage(-30);
				this.controlInstance.setRange(10);
			}
		}, this));
		$('#presets .maximum').on('click', $.proxy(function(e) {
			e.preventDefault();			
			if (this.controlInstance) {
				this.controlInstance.unMute();			
				this.controlInstance.setAverage(0);
				this.controlInstance.setRange(0);
			}
		}, this));
		$('#presets .easy').on('click', $.proxy(function(e) {
			e.preventDefault();
			if (this.controlInstance) {
				this.controlInstance.unMute();
				this.controlInstance.setAverage(-41.5);
				this.controlInstance.setPreset(0);
			}
		}, this));
		$('#presets .standard').on('click', $.proxy(function(e) {
			e.preventDefault();
			if (this.controlInstance) {
				this.controlInstance.unMute();
				this.controlInstance.setAverage(-41.5);
				this.controlInstance.setPreset(1);
			}
		}, this));
		$('#presets .wide').on('click', $.proxy(function(e) {
			e.preventDefault();
			if (this.controlInstance) {
				this.controlInstance.unMute();
				this.controlInstance.setAverage(-41.5);
				this.controlInstance.setPreset(2);
			}
		}, this));
		$('#presets .full').on('click', $.proxy(function(e) {
			e.preventDefault();
			if (this.controlInstance) {
				this.controlInstance.unMute();
				this.controlInstance.setAverage(-41.5);
				this.controlInstance.setRange(1000, false);
			}
		}, this));

		$('#presets li').on('click', function(e) {
			e.preventDefault();

			$('#presets li').not($(this)).removeClass('open').find('.info').slideUp();
			$(this).addClass('open').find('.info').slideDown();
		});
	},

	bindStepNavigation: function() {
		$('.step_nav .iconfont').on('click', $.proxy(function(e) {
			e.preventDefault();
			var link = $(e.currentTarget);
			var nr = this.getStepNr(link);
			console.log(nr);
			this.gotoStepNr(nr, true);
		}, this));
		
		$('#step_title5 .learn_more span').on('click', function(e) {
			e.preventDefault();
			$('.step5_show_default').slideUp();
			$('.step5_hide_default:not(.no_toggle)').slideDown(function() {				
				$(window).resize();
			});
		});
	},
	
	bindFooterScroll: function() {
		var res = function() {
			var h = $(window).height();
			var f = $('#footer');
			
			f.css('position', 'relative');
			var f_bottom = f.position().top + f.outerHeight();
			f.css('position', 'absolute');
			
			var off = Math.round(h - f_bottom);
//			f.css('margin-top', Math.max(0, off) + 'px');
			if(off>0) {
				f.css('bottom', '0');
				f.css('position', 'absolute');
			} else {
				f.css('position', 'relative');
			}
				
		};
		$(window).on('resize', res).resize();
		setTimeout(res, 0);
	},
	
	resetLevelControl: function(slide) {
		if (this.controlInstance) {
			this.controlInstance.unMute();
			this.controlInstance.setAverage(-41.5);
			this.controlInstance.setPreset((slide == 4) ? 2 : 1);
		}
	},
	
	getCurrentStep: function() {
		return $('.step_desc').find('.step:visible').first();
	},	
	
	getStepNr: function(elem) {
		var cur_step = elem.attr('id').replace( /^\D+/g, '');
		return parseInt(cur_step);
	},

	getCurrentStepNr: function() {
		return this.getStepNr(this.getCurrentStep());
	},	
	
	gotoStepNr: function(step_nr, fast) {
		var step = $('#step_desc'+step_nr + ',#step_title'+step_nr);
		if (step.length) {
			
			if (fast) {
				
				$('.level_disabled').show();
				$('.step_desc .step:visible, .step_title .step:visible').fadeOut(this.fadeTime, $.proxy(function() {
					this.resetLevelControl(step_nr);
					
					$('.step5_show_default').toggle(step_nr == 5);
					$('.step5_hide_default').toggle(step_nr != 5);
					$('.step_nav .icon-dot-selected').removeClass('icon-dot-selected').addClass('icon-dot');
					$('.step_nav #goto' + step_nr).removeClass('icon-dot').addClass('icon-dot-selected');
					
					$(window).resize();
					step.fadeIn(this.fadeTime, $.proxy(function() {
						$(window).resize();
						$('.level_disabled').hide();
					}, this));
				}, this));
				
			} else {
				
				$('.level_disabled').show();
				
				$('.step_desc .step:visible, .step_title .step:visible').delay(this.autoStepDelay).fadeOut(this.fadeTime, $.proxy(function() {
					this.resetLevelControl(step_nr);
					
					$('.step5_show_default').toggle(step_nr == 5);
					$('.step5_hide_default').toggle(step_nr != 5);
					$('.step_nav .icon-dot-selected').removeClass('icon-dot-selected').addClass('icon-dot');
					$('.step_nav #goto' + step_nr).removeClass('icon-dot').addClass('icon-dot-selected');
					
					$(window).resize();
					step.fadeIn(this.fadeTime, $.proxy(function() {
						$(window).resize();
						$('.level_disabled').hide();
					}, this));
				}, this));				
			}
			
		}
	},
	
	gotoNextStep: function(fast) {
		var next_step = this.getCurrentStep().next();
		if (next_step.length) {			
			this.gotoStepNr(this.getStepNr(next_step), fast);
		}
	},
	
	gotoPrevStep: function(fast) {
		var prev_step = this.getCurrentStep().prev();
		if (prev_step.length) {			
			this.gotoStepNr(this.getStepNr(prev_step), fast);
		}
	},
	
	stepDone: function() {
		this.getCurrentStep().find('.checked').removeClass('hidden');
		this.gotoNextStep(false);
	}
};

$(function() {
	level_help.init();
});
