/*!
 * Rule the words! KKuTu Online
 * Copyright (C) 2020  JJoriping(op@jjo.kr)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import $ = require("jquery");

import { DateUnit } from "back/utils/enums/DateUnit";
import { Rule, RULE_TABLE, RuleOption } from "back/utils/Rule";
import { loadSounds } from "./utils/Audio";
import { prettyTime } from "./utils/Format";
import { connectLobby } from "./utils/GameClient";
import { G, initialize, L } from "./utils/Global";
import { isRoomMatched } from "./utils/Room";
import { applySettings, checkCompatibility } from "./utils/Utility";

/**
 * 자주 쓰이는 JQuery 객체를 담은 객체.
 */
export const $stage:Partial<{
  'intro':JQuery,
  'introText':JQuery,
  'loading':JQuery,
  'dialog':{
    'help':JQuery,
    'settings':JQuery,
    'room':JQuery,
    'extended-theme':JQuery,
    'quick':JQuery
  },
  'menu':{
    'help':JQuery,
    'settings':JQuery,
    'community':JQuery,
    'spectate':JQuery,
    'room-set':JQuery,
    'room-new':JQuery,
    'room-quick':JQuery,
    'shop':JQuery,
    'dictionary':JQuery,
    'invite':JQuery,
    'practice':JQuery,
    'ready':JQuery,
    'start':JQuery,
    'exit':JQuery,
    'replay':JQuery,
    'leaderboard':JQuery
  }
}> = {};
/**
 * 자주 쓰이는 전역 정보를 담은 객체.
 */
export const $data:Partial<{
  'audioContext':AudioContext,
  'bgm':AudioBuffer,
  'extensions':string[],
  'extensionPrefix':string,
  'mutedBGM':boolean,
  'mutedSE':boolean,
  'options':RuleOption[],
  'phase':UIPhase,
  'quick':{
    'tick':number,
    'timer':number,
    'prepared':boolean
  },
  'room':{
    'title':string,
    'limit':number,
    'mode':Rule,
    'round':number,
    'time':number,
    'options':{
      [key in RuleOption]: boolean
    }&{
      'extensions':string[]
    }
  },
  'rooms':KKuTu.Game.Room[],
  'settings':KKuTu.ClientSettings,
  'roomAction':"new"|"set",
  'url':string
}> = {};

enum UIPhase{
  LOBBY = "lobby",
  MASTER = "master",
  NORMAL = "normal",
  GAMING = "gaming"
}

$(document).ready(async () => {
  initialize();
  if(!checkCompatibility()){
    updateLoading(L('compatibility-error'));

    return;
  }
  $stage.intro = $("#intro");
  $stage.introText = $("#intro-text");
  $stage.loading = $("#loading");
  $stage.dialog = {
    'help': $("#dialog-help"),
    'settings': $("#dialog-settings"),
    'room': $("#dialog-room"),
    'extended-theme': $("#dialog-extended-theme"),
    'quick': $("#dialog-quick")
  };
  $stage.menu = {
    'help': $("#menu-help"),
    'settings': $("#menu-settings"),
    'community': $("#menu-community"),
    'spectate': $("#menu-spectate"),
    'room-set': $("#menu-room-set"),
    'room-new': $("#menu-room-new"),
    'room-quick': $("#menu-room-quick"),
    'shop': $("#menu-shop"),
    'dictionary': $("#menu-dictionary"),
    'invite': $("#menu-invite"),
    'practice': $("#menu-practice"),
    'ready': $("#menu-ready"),
    'start': $("#menu-start"),
    'exit': $("#menu-exit"),
    'replay': $("#menu-replay"),
    'leaderboard': $("#menu-leaderboard")
  };

  $data.options = Object.values(RuleOption).filter(w => w.length === 3);
  $data.rooms = [];
  $data.url = $("#url").text();

  await loadSounds();
  await connectLobby($data.url);

  // 메뉴
  $stage.menu.help.on('click', () => {
    $("#help-board").attr('src', "/help");
    showDialog($stage.dialog.help);
  });
  $stage.menu.settings.on('click', () => {
    showDialog($stage.dialog.settings);
  });
  $stage.menu['room-new'].on('click', () => {
    $data.roomAction = "new";
    $stage.dialog.quick.hide();
    showDialog($stage.dialog.room);
    $stage.dialog.room.find(".dialog-title").html(L('dialog-room-new-title'));
  });
  $stage.menu['room-set'].on('click', () => {
    const rule = RULE_TABLE[$data.room.mode];

    $data.roomAction = "set";
    $("#room-title").val($data.room.title);
    $("#room-limit").val($data.room.limit);
    $("#room-mode").val($data.room.mode).trigger('change');
    $("#room-round").val($data.room.round);
    $("#room-time").val($data.room.time / rule.time);
    for(const v of $data.options){
      $(`#room-option-${v}`).attr('checked', $data.room.options[v] ? "checked" : null);
    }
    $data.extensions = $data.room.options.extensions;
    showDialog($stage.dialog.room);
    $stage.dialog.room.find(".dialog-title").html(L('dialog-room-set-title'));
  });
  // 대화상자 - 설정
  $("#settings-ok").on('click', () => {
    applySettings({
      mb: $("#mute-bgm").is(':checked'),
      me: $("#mute-effect").is(':checked'),
      di: $("#deny-invite").is(':checked'),
      dw: $("#deny-whisper").is(':checked'),
      df: $("#deny-friend").is(':checked'),
      ar: $("#auto-ready").is(':checked'),
      su: $("#sort-user").is(':checked'),
      ow: $("#only-waiting").is(':checked'),
      ou: $("#only-unlock").is(':checked')
    });
    $.cookie('kks', JSON.stringify($data.settings));
    $stage.dialog.settings.hide();
  });
  $("#settings-server").on('click', () => {
    location.href = "/";
  });
  // 대화상자 - 방
  $("#room-mode").on('change', () => {
    const value = $("#room-mode").val() as Rule;
    const rule = RULE_TABLE[value];

    $("#game-mode-expl").html(L(`x-mode-${value}`));
    updateGameOptions(rule.options, 'room');

    $data.extensions = [];
    if(rule.options.includes(RuleOption.EXTENSIONS)){
      $("#room-extensions").show();
    }else{
      $("#room-extensions").hide();
    }
    if(rule.name === "Typing"){
      $("#room-round").val(3);
    }
    $("#room-time").children("option").each((i, o) => {
      $(o).html(Number($(o).val()) * rule.time + L('SECOND'));
    });
  }).trigger('change');
  // 대화상자 - 주제 선택
  $("#room-extensions").on('click', () => {
    const rule = RULE_TABLE[$("#room-mode").val() as Rule];

    $("#extension-list>div").hide();
    if(rule.locale === "ko"){
      $data.extensionPrefix = "#ko-pick-";
      $("#ko-pick-list").show();
    }else if(rule.locale === "en"){
      $data.extensionPrefix = "#en-pick-";
      $("#en-pick-list").show();
    }
    $("#pick-none").trigger('click');
    for(const v of $data.extensions){
      $($data.extensionPrefix + v).prop('checked', true);
    }
    showDialog($stage.dialog['extended-theme']);
  });
  $("#pick-all").on('click', () => {
    $("#extension-list input").prop('checked', true);
  });
  $("#pick-none").on('click', () => {
    $("#extension-list input").prop('checked', false);
  });
  $("#injpick-ok").on('click', () => {
    const $target = $(`${$data.extensionPrefix}list`);
    const PREFIX_OFFSSET = 8;
    const list:string[] = [];

    $target.find("input").each((i, o) => {
      const id = $(o).attr('id').slice(PREFIX_OFFSSET);

      if($(o).is(':checked')){
        list.push(id);
      }
    });
    $data.extensions = list;
    $stage.dialog['extended-theme'].hide();
  });
  // 대화상자 - 빠른 입장
  $stage.menu['room-quick'].on('click', () => {
    $stage.dialog.room.hide();
    showDialog($stage.dialog.quick);
    if($stage.dialog.quick.is(':visible')){
      $("#dialog-quick>.dialog-body").find("*").prop('disabled', false);
      $("#quick-mode").trigger('change');
      $("#quick-queue").html("");
      $("#quick-ok").removeClass("searching").html(L('OK'));
    }
  });
  $("#quick-ok").on('click', () => {
    const INTERVAL_QUICK = 1000;
    const rule = $("#quick-mode").val() as Rule;
    const options = getGameOptions('quick');

    if($data.phase !== UIPhase.LOBBY){
      return;
    }
    if($("#quick-ok").hasClass("searching")){
      $stage.dialog.quick.hide();
      onTick();
      $stage.menu['room-quick'].trigger('click');

      return;
    }
    $("#dialog-quick>.dialog-body").find("*").prop('disabled', true);
    $("#quick-ok")
      .addClass("searching")
      .html(`<i class="fa fa-spinner fa-spin"></i> ${L('NO')}`)
      .prop('disabled', false)
    ;
    $data.quick = {
      tick: 0,
      timer: window.setInterval(onTick, INTERVAL_QUICK),
      prepared: false
    };
    function onTick():void{
      const candidates:number[] = [];

      if(!$stage.dialog.quick.is(':visible')){
        clearTimeout($data.quick.timer);

        return;
      }
      $("#quick-queue").html(L('quick-queue', prettyTime($data.quick.tick++ * DateUnit.SECOND)));
      for(const v of $data.rooms){
        if(isRoomMatched(v, rule, options)){
          candidates.push(v.id);
        }
      }
      if(candidates.length){
        $data.quick.prepared = true;
        $(`#room-${candidates[Math.floor(Math.random() * candidates.length)]}`).trigger('click');
      }
    }
  });
  $("#quick-mode, #dialog-quick .game-option").on('change', e => {
    const value = $("#quick-mode").val() as Rule;
    let counter = 0;
    let options:Table<true>;

    if(e.currentTarget.id === "quick-mode"){
      $("#dialog-quick .game-option").prop('checked', false);
    }
    options = getGameOptions('quick');
    updateGameOptions(RULE_TABLE[value].options, 'quick');
    for(const v of $data.rooms){
      if(isRoomMatched(v, value, options, true)){
        counter++;
      }
    }
    $("#quick-status").html(L('quick-status', counter));
  });
});
/**
 * 대화상자를 보인다.
 *
 * 이미 보이는 경우 `noToggle`이 `true`가 아닌 한 대화상자를 숨긴다.
 *
 * @param $target 보여줄 대화상자 객체.
 * @param noToggle 토글 비활성화 여부. `true`인 경우 이 함수 호출로는 대화상자가 숨겨지지 않는다.
 */
export function showDialog($target:JQuery, noToggle?:boolean):boolean{
  if(!noToggle && $target.is(':visible')){
    $target.hide();

    return false;
  }
  $(".dialog-front").removeClass("dialog-front");
  $target.show().addClass("dialog-front").css({
    left: (G.windowSize[0] - $target.width()) / 2,
    top: (G.windowSize[1] - $target.height()) / 2
  });

  return true;
}
/**
 * 주어진 식별자로부터 특수 규칙 활성화 여부 표를 구해 반환한다.
 *
 * @param prefix 객체 식별자의 접두어.
 */
export function getGameOptions(prefix:string):Table<true>{
  const R:Table<true> = {};

  for(const v of $data.options){
    if($(`#${prefix}-${v}`).is(':checked')){
      R[v] = true;
    }
  }

  return R;
}
/**
 * 주어진 특수 규칙 목록에 맞게 객체의 표시 여부를 전환한다.
 *
 * @param options 특수 규칙 목록.
 * @param prefix 표시 여부를 바꿀 객체 식별자의 접두어.
 */
export function updateGameOptions(options:string[], prefix:string):void{
  for(const v of $data.options){
    const $target = $(`#${prefix}-${v}-panel`);

    if(options.includes(v)) $target.show();
    else $target.hide();
  }
}
/**
 * 로딩 화면에 내용을 표시한다.
 *
 * 인트로 화면이 나타나 있다면 로딩 화면 대신 인트로 화면에서 내용을 표시한다.
 * 로딩 화면은 다른 객체를 선택할 수 없게 만든다.
 *
 * @param html 표시할 내용. Falsy한 경우 로딩 화면을 숨긴다.
 */
export function updateLoading(html?:string):void{
  if(html){
    if($stage.intro.is(':visible')){
      $stage.loading.hide();
      $stage.introText.html(html);
    }else{
      $stage.loading.show().html(html);
    }
  }else{
    $stage.loading.hide();
  }
}
/**
 * UI 페이즈를 갱신한다.
 *
 * UI 페이즈는 `UIPhase`의 한 값으로 결정된다.
 */
export function updatePhase():void{
  $data.phase = UIPhase.LOBBY;
}
/**
 * UI를 갱신한다.
 *
 * UI는 `UIPhase`에 따라 달라진다.
 */
export function updateUI():void{
  updatePhase();

  $(".kkutu-menu>button").hide();
  $(`.kkutu-menu>.for-${$data.phase}`).show();
}
