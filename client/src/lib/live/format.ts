import englishSource from '../../resources/lang/en_us.json';
import brokenKeyboardSource from '../../resources/lang/broken_keyboard.json';
import dyslexicSource from '../../resources/lang/dyslexic.json';
import chatMessageStyleSource from '../../resources/styling/chatMessage.json';
import type {
  ChatMessage,
  ChatMessageVariant,
  PlayerTag,
  Verdict,
  VisitTag
} from '$lib/game/chat';
import type { ControllerID, ControllerSelection, KiraGuess } from '$lib/game/controllers';
import type { GraveDeathCause } from '$lib/game/graves';
import type { PhaseState } from '$lib/game/phases';
import type { RoleList, RoleOutline, RoleOutlineOption } from '$lib/game/role-list';
import type { Conclusion, PlayerIndex, Role, WinCondition } from '$lib/game/roles';
import type { Language } from '$lib/game/storage';

const languagePacks: Record<Language, Record<string, string>> = {
  en_us: englishSource,
  broken_keyboard: brokenKeyboardSource,
  dyslexic: dyslexicSource
};
const chatMessageStyles = chatMessageStyleSource as Record<string, string>;
let activeLanguagePack = languagePacks.en_us;

export function setLanguage(language: Language): void {
  activeLanguagePack = languagePacks[language];
}

export function text(key: string, ...values: Array<string | number>): string {
  let translated = activeLanguagePack[key] ?? humanize(key.split('.').at(-1) ?? key);

  for (const [index, value] of values.entries()) {
    translated = translated.replaceAll(`\\${index}`, String(value));
  }

  return translated;
}

export function optionalText(key: string, ...values: Array<string | number>): string | null {
  if (!(key in activeLanguagePack)) {
    return null;
  }

  return text(key, ...values);
}

export function humanize(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function roleName(role: Role | null | undefined): string {
  if (!role) {
    return 'Unknown role';
  }

  return text(`role.${role}.name`);
}

export function modifierName(modifier: string): string {
  return optionalText(`wiki.article.modifier.${modifier}.title`) ?? humanize(modifier);
}

export function phaseName(phase: PhaseState['type']): string {
  return text(`phase.${phase}`);
}

export function tagName(tag: PlayerTag): string {
  return optionalText(`tag.${tag}.name`) ?? humanize(tag);
}

export function conclusionName(conclusion: Conclusion): string {
  if (conclusion === 'politician') {
    return roleName('politician');
  }

  return optionalText(`winCondition.${conclusion}`) ?? text(conclusion);
}

export function winConditionName(winCondition: WinCondition): string {
  if (winCondition.type === 'roleStateWon') {
    return text('winCondition.independent');
  }
  if (winCondition.winIfAny.length === 0) {
    return text('winCondition.loser');
  }

  const minionConclusions: Conclusion[] = ['mafia', 'fiends', 'cult', 'politician'];
  if (
    winCondition.winIfAny.length === minionConclusions.length &&
    minionConclusions.every((conclusion) => winCondition.winIfAny.includes(conclusion))
  ) {
    return text('winCondition.minion');
  }

  return winCondition.winIfAny.map(conclusionName).join(` ${text('union')} `);
}

function optionName(option: RoleOutlineOption, players: string[]): string {
  const parts: string[] = [];
  if (option.playerPool) {
    parts.push(option.playerPool.map((index) => playerName(players, index)).join(` ${text('union')} `));
  }
  if (option.insiderGroups) {
    const group =
      option.insiderGroups.length === 0
        ? text('chatGroup.all.icon')
        : option.insiderGroups.map((value) => text(`chatGroup.${value}.icon`)).join('|');
    parts.push(group);
  }
  if (option.winIfAny) {
    parts.push(winConditionName({ type: 'gameConclusionReached', winIfAny: option.winIfAny }));
  }
  parts.push('role' in option ? roleName(option.role) : text(option.roleSet));
  return parts.join(', ');
}

export function roleOutlineName(outline: RoleOutline, players: string[] = []): string {
  return outline.map((option) => optionName(option, players)).join(text('union:var.0'));
}

export function playerName(players: string[], index: PlayerIndex): string {
  return players[index] ?? text('player.unknown', index + 1);
}

function playerList(players: string[], indexes: PlayerIndex[]): string {
  if (indexes.length === 0) {
    return text('nobody');
  }

  return indexes.map((index) => playerName(players, index)).join(', ');
}

function roleListName(roles: Role[]): string {
  if (roles.length === 0) {
    return text('none');
  }

  return roles.map(roleName).join(', ');
}

function graveDeathCauseName(cause: GraveDeathCause): string {
  if (cause.type === 'role') {
    return roleName(cause.value);
  }
  if (cause.type === 'roleSet') {
    return text(cause.value);
  }

  return text(`grave.deathCause.${cause.type}`);
}

function graveDeathCauseList(causes: GraveDeathCause[]): string {
  if (causes.length === 0) {
    return text('none');
  }

  return causes.map(graveDeathCauseName).join(', ');
}

export function controllerName(id: ControllerID): string {
  if (id.type === 'role') {
    return [
      roleName(id.role),
      optionalText(`controllerId.role.${id.role}.${id.id}.name`) ?? `Ability ${id.id + 1}`
    ].join(' · ');
  }

  return optionalText(`controllerId.${id.type}.name`) ?? humanize(id.type);
}

function controllerTranslationKey(id: ControllerID): string {
  if (id.type === 'role') {
    return `controllerId.role.${id.role}.${id.id}`;
  }

  return `controllerId.${id.type}`;
}

function kiraGuessName(guess: KiraGuess): string {
  if (guess === 'none' || guess === 'nonTown') {
    return text(guess);
  }

  return roleName(guess);
}

export function selectionName(
  selection: ControllerSelection,
  players: string[],
  roleList: RoleList
): string {
  switch (selection.type) {
    case 'unit':
      return text('chatMessage.abilityUsed.selection.unit');
    case 'boolean':
      return selection.selection ? text('on') : text('off');
    case 'playerList':
      return playerList(players, selection.selection);
    case 'twoPlayerOption':
      return selection.selection ? playerList(players, selection.selection) : text('none');
    case 'roleList':
      return roleListName(selection.selection);
    case 'twoRoleOption':
      return selection.selection.map((role) => (role === null ? text('none') : roleName(role))).join(', ');
    case 'twoRoleOutlineOption':
      return selection.selection
        .map((index) =>
          index === null ? text('none') : roleOutlineName(roleList[index] ?? [], players) || text('unknown')
        )
        .join(', ');
    case 'graveDeathCauses':
      return graveDeathCauseList(selection.selection);
    case 'string':
      return replaceMentions(selection.selection, players, roleList);
    case 'integer':
      return String(selection.selection);
    case 'kira':
      return selection.selection
        .map(([index, guess]) => `${playerName(players, index)}: ${kiraGuessName(guess)}`)
        .join(', ');
    case 'chatMessage':
      return selection.selection === null ? text('none') : `Message ${selection.selection}`;
  }
}

function selectionChatName(
  id: ControllerID,
  selection: ControllerSelection,
  players: string[],
  roleList: RoleList
): string {
  switch (selection.type) {
    case 'unit':
      return text('chatMessage.abilityUsed.selection.unit');
    case 'boolean': {
      const value =
        optionalText(`${controllerTranslationKey(id)}.boolean.${selection.selection}`) ??
        (selection.selection ? text('on') : text('off'));
      return text('chatMessage.abilityUsed.selection.boolean', value);
    }
    case 'playerList':
      return text(
        'chatMessage.abilityUsed.selection.playerList',
        playerList(players, selection.selection)
      );
    case 'twoPlayerOption':
      return text(
        'chatMessage.abilityUsed.selection.twoPlayerOption',
        selection.selection ? playerList(players, selection.selection) : text('none')
      );
    case 'roleList':
      return text('chatMessage.abilityUsed.selection.roleList', roleListName(selection.selection));
    case 'twoRoleOption':
      return text(
        'chatMessage.abilityUsed.selection.twoRoleOption',
        selection.selection[0] === null ? text('none') : roleName(selection.selection[0]),
        selection.selection[1] === null ? text('none') : roleName(selection.selection[1])
      );
    case 'twoRoleOutlineOption':
      return text(
        'chatMessage.abilityUsed.selection.twoRoleOutlineOption',
        selection.selection[0] === null
          ? text('none')
          : roleOutlineName(roleList[selection.selection[0]] ?? [], players) || text('unknown'),
        selection.selection[1] === null
          ? text('none')
          : roleOutlineName(roleList[selection.selection[1]] ?? [], players) || text('unknown')
      );
    case 'graveDeathCauses':
      return text(
        'chatMessage.abilityUsed.selection.graveDeathCauses',
        graveDeathCauseList(selection.selection)
      );
    case 'string':
      return text(
        'chatMessage.abilityUsed.selection.string',
        replaceMentions(selection.selection, players, roleList)
      );
    case 'integer': {
      const value =
        optionalText(`${controllerTranslationKey(id)}.integer.${selection.selection}`) ??
        String(selection.selection);
      return text('chatMessage.abilityUsed.selection.integer', value);
    }
    case 'kira': {
      const choices = selection.selection
        .map(([index, guess]) => `${playerName(players, index)}: ${kiraGuessName(guess)}`)
        .join('\n');
      return `\n${text('chatMessage.kiraSelection')}\n${choices}`;
    }
    case 'chatMessage':
      return selection.selection === null ? '' : ` selecting message ${selection.selection}`;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionPattern(value: string): RegExp {
  return new RegExp(`(?<![a-zA-Z])${escapeRegExp(value)}(?![a-zA-Z0-9])`, 'gi');
}

/** Expands player and role-outline mentions without turning chat text into HTML. */
export function replaceMentions(source: string, players: string[], roleList: RoleList): string {
  let expanded = source;

  for (let index = players.length - 1; index >= 0; index -= 1) {
    expanded = expanded.replace(mentionPattern(`@${index + 1}`), playerName(players, index));
  }
  for (let index = players.length - 1; index >= 0; index -= 1) {
    const name = players[index];
    if (name.length === 0) {
      continue;
    }
    expanded = expanded.replace(mentionPattern(`@${name}`), name);
  }
  for (let index = roleList.length - 1; index >= 0; index -= 1) {
    const outline = roleOutlineName(roleList[index], players);
    expanded = expanded.replace(mentionPattern(`@o${index + 1}`), `${index + 1}: ${outline}`);
  }

  return expanded;
}

function phaseChangeName(phase: PhaseState, dayNumber: number, players: string[]): string {
  if (phase.type === 'recess') {
    return text('chatMessage.phaseChange.recess');
  }
  if (phase.type === 'nomination') {
    if (phase.trialsLeft === 1) {
      return text('chatMessage.phaseChange.nomination.lastTrial', phaseName(phase.type), dayNumber);
    }

    return text(
      'chatMessage.phaseChange.nomination',
      phaseName(phase.type),
      dayNumber,
      phase.trialsLeft
    );
  }
  if ('playerOnTrial' in phase) {
    return text(
      'chatMessage.phaseChange.trial',
      phaseName(phase.type),
      dayNumber,
      playerName(players, phase.playerOnTrial)
    );
  }

  return text('chatMessage.phaseChange', phaseName(phase.type), dayNumber);
}

function visitTagName(tag: VisitTag): string {
  if (tag.type === 'ability') {
    if (tag.ability.type === 'role') {
      return roleName(tag.ability.role);
    }

    return humanize(tag.ability.type);
  }
  if (tag.type === 'appeared') {
    return text('visitTag.appeared.name');
  }

  return text('visitTag.syndicateGun.name');
}

function visitTagList(tags: VisitTag[]): string {
  if (tags.length === 0) {
    return text('none');
  }

  return tags.map(visitTagName).join(', ');
}

function normalSenderName(
  sender: Extract<ChatMessageVariant, { type: 'normal' }>['messageSender'],
  players: string[]
): string {
  if (sender.type === 'player' || sender.type === 'livingToDead') {
    return playerName(players, sender.player);
  }

  return roleName(sender.type);
}

function formatGameOver(
  variant: Extract<ChatMessageVariant, { type: 'gameOver' }>,
  players: string[],
  roleList: RoleList
): string {
  const conclusion =
    optionalText(`chatMessage.gameOver.conclusion.${variant.synopsis.conclusion}`) ??
    text('chatMessage.gameOver.conclusion.unknown', conclusionName(variant.synopsis.conclusion));

  const playerSummaries = variant.synopsis.playerSynopses.map((synopsis, index) => {
    const result = text(
      `chatMessage.gameOver.player.won.${synopsis.won}`,
      playerName(players, index)
    );
    const outline = roleOutlineName(roleList[synopsis.outlineAssignment] ?? [], players) || text('unknown');
    const history = synopsis.crumbs
      .map((crumb) => {
        const groups =
          crumb.insiderGroups.map((group) => text(`chatGroup.${group}.icon`)).join('|') ||
          text('chatGroup.all.icon');
        return text(
          'chatMessage.gameOver.player.crumb',
          groups,
          winConditionName(crumb.winCondition),
          roleName(crumb.role)
        );
      })
      .join(' → ');
    const historySuffix = history.length === 0 ? '' : `: ${history}`;

    return `${result} (${synopsis.outlineAssignment + 1}: ${outline}${historySuffix})`;
  });

  return [conclusion, ...playerSummaries].join('\n');
}

function formatKiraResult(
  variant: Extract<ChatMessageVariant, { type: 'kiraResult' }>,
  players: string[]
): string {
  const guesses = [...variant.result.guesses]
    .sort(([left], [right]) => left - right)
    .map(([index, [guess, result]]) => {
      if (guess === 'none') {
        return `${playerName(players, index)}: ${kiraGuessName(guess)}`;
      }

      const resultIcon = result === 'correct' ? '🟩' : result === 'wrongSpot' ? '🟨' : '🟥';
      return `${playerName(players, index)}: ${kiraGuessName(guess)} ${resultIcon} ${text(`kiraResult.${result}`)}`;
    });

  return [text('chatMessage.kiraResult'), ...guesses].join('\n');
}

export interface ChatFormatOptions {
  twoThirdsMajority?: boolean;
}

function formatVariant(
  variant: ChatMessageVariant,
  players: string[],
  roleList: RoleList,
  options: ChatFormatOptions
): string {
  switch (variant.type) {
    case 'lobbyMessage':
      return `${variant.sender}: ${replaceMentions(variant.text, players, roleList)}`;
    case 'normal': {
      const separator = variant.block ? ':\n' : ': ';
      return `${normalSenderName(variant.messageSender, players)}${separator}${replaceMentions(variant.text, players, roleList)}`;
    }
    case 'whisper':
      return text(
        'chatMessage.whisper',
        playerName(players, variant.fromPlayerIndex),
        playerName(players, variant.toPlayerIndex),
        replaceMentions(variant.text, players, roleList)
      );
    case 'broadcastWhisper':
      return text(
        'chatMessage.broadcastWhisper',
        playerName(players, variant.whisperer),
        playerName(players, variant.whisperee)
      );
    case 'roleAssignment':
    case 'gainedRoleAbility':
      return text(`chatMessage.${variant.type}`, roleName(variant.role));
    case 'playerDied': {
      const role =
        variant.grave.information.type === 'normal'
          ? roleName(variant.grave.information.role)
          : text('obscured');
      return text('chatMessage.playerDied', playerName(players, variant.grave.player), role);
    }
    case 'playersRoleRevealed':
      return text(
        'chatMessage.playersRoleRevealed',
        playerName(players, variant.player),
        roleName(variant.role)
      );
    case 'playersRoleConcealed':
      return text('chatMessage.playersRoleConcealed', playerName(players, variant.player));
    case 'tagAdded':
    case 'tagRemoved':
      return text(
        `chatMessage.${variant.type}`,
        playerName(players, variant.player),
        tagName(variant.tag),
        text(`tag.${variant.tag}`)
      );
    case 'gameOver':
      return formatGameOver(variant, players, roleList);
    case 'playerQuit':
      return text(
        `chatMessage.playerQuit${variant.gameOver ? '.gameOver' : ''}`,
        playerName(players, variant.playerIndex)
      );
    case 'phaseChange':
      return phaseChangeName(variant.phase, variant.dayNumber, players);
    case 'trialInformation':
      return text('chatMessage.trialInformation', variant.requiredVotes, variant.trialsLeft);
    case 'voted':
      return variant.votee === null
        ? text('chatMessage.voted.cleared', playerName(players, variant.voter))
        : text(
            'chatMessage.voted',
            playerName(players, variant.voter),
            playerName(players, variant.votee)
          );
    case 'playerNominated':
      return text(
        'chatMessage.playerNominated',
        playerName(players, variant.playerIndex),
        playerList(players, variant.playersVoted)
      );
    case 'judgementVerdict':
      return text(
        'chatMessage.judgementVerdict',
        playerName(players, variant.voterPlayerIndex),
        text(`verdict.${variant.verdict}`)
      );
    case 'trialVerdict':
      const guilty = options.twoThirdsMajority
        ? variant.innocent <= Math.floor(variant.guilty / 2)
        : variant.innocent < variant.guilty;
      return text(
        'chatMessage.trialVerdict',
        playerName(players, variant.playerOnTrial),
        guilty ? text('verdict.guilty') : text('verdict.innocent'),
        variant.innocent,
        variant.guilty
      );
    case 'witnessesCalled':
      return text(
        'chatMessage.witnessesCalled',
        playerName(players, variant.playerOnTrial),
        playerList(players, variant.witnesses)
      );
    case 'abilityUsed':
      return text(
        'chatMessage.abilityUsed',
        playerName(players, variant.player),
        controllerName(variant.abilityId),
        selectionChatName(variant.abilityId, variant.selection, players, roleList)
      );
    case 'playerEnfranchised':
      return text('chatMessage.playerEnfranchised', playerName(players, variant.playerIndex));
    case 'reporterReport':
      return text(
        'chatMessage.reporterReport',
        replaceMentions(variant.report, players, roleList)
      );
    case 'playerIsBeingInterviewed':
    case 'jailedTarget':
    case 'jailedSomeone':
      return text(`chatMessage.${variant.type}`, playerName(players, variant.playerIndex));
    case 'mediumHauntStarted':
    case 'mediumSeance':
      return text(
        `chatMessage.${variant.type}`,
        playerName(players, variant.medium),
        playerName(players, variant.player)
      );
    case 'votesHidden':
      return text(`chatMessage.votesHidden.${variant.value}`);
    case 'deputyKilled':
      return text('chatMessage.deputyKilled', playerName(players, variant.shot));
    case 'wardenPlayersImprisoned':
      return text(
        'chatMessage.wardenPlayersImprisoned',
        playerList(players, variant.players)
      );
    case 'cultSacrificeCount':
      return text('chatMessage.cultSacrificeCount', variant.count);
    case 'puppeteerPlayerIsNowMarionette':
    case 'recruiterPlayerIsNowRecruit':
    case 'santaAddedPlayerToNaughtyList':
      return text(`chatMessage.${variant.type}`, playerName(players, variant.player));
    case 'nextSantaAbility':
    case 'nextKrampusAbility':
      return text(`chatMessage.${variant.type}.${variant.ability}`);
    case 'detectiveResult':
      return text(`chatMessage.detectiveResult.${variant.suspicious ? 'suspicious' : 'innocent'}`);
    case 'lookoutResult':
    case 'trackerResult':
    case 'spyMafiaVisit':
      return text(`chatMessage.${variant.type}`, playerList(players, variant.players));
    case 'seerResult':
      return text(`chatMessage.seerResult.${variant.enemies ? 'enemies' : 'friends'}`);
    case 'gossipResult':
      return text(`chatMessage.gossipResult.${variant.enemies ? 'enemies' : 'none'}`);
    case 'spyBug':
      return text('chatMessage.spyBug', visitTagList(variant.visitTags));
    case 'psychicGood':
      return text('chatMessage.psychicGood', playerName(players, variant.player));
    case 'psychicEvil':
      return text(
        'chatMessage.psychicEvil',
        playerName(players, variant.first),
        playerName(players, variant.second)
      );
    case 'auditorResult':
      return replaceMentions(
        text(
          'chatMessage.auditorResult',
          variant.outlineIndex + 1,
          roleListName(variant.result)
        ),
        players,
        roleList
      );
    case 'dreamwalkerResult':
      return variant.result.length === 0
        ? text('chatMessage.dreamwalkerResult.none')
        : text('chatMessage.dreamwalkerResult', roleListName(variant.result));
    case 'dreamwalkerTarget':
      return text('chatMessage.dreamwalkerTarget', playerName(players, variant.target));
    case 'snoopResult':
      return text(`chatMessage.snoopResult.${variant.townie ? 'townie' : 'inconclusive'}`);
    case 'polymathSnoopResult':
      return text(
        variant.inno ? 'chatMessage.detectiveResult.innocent' : 'chatMessage.snoopResult.inconclusive'
      );
    case 'tallyClerkResult':
      return text('chatMessage.tallyClerkResult', variant.evilCount);
    case 'trapState':
    case 'trapStateEndOfNight':
      return text(`chatMessage.${variant.type}.${variant.state.type}`);
    case 'fragileVestBreak':
      return text(
        'chatMessage.fragileVestBreak',
        text(`defense.${variant.defense}`),
        playerName(players, variant.playerWithVest)
      );
    case 'godfatherBackup':
      return variant.backup === null
        ? text('chatMessage.godfatherBackup.nobody')
        : text('chatMessage.godfatherBackup', playerName(players, variant.backup));
    case 'godfatherBackupKilled':
      return text('chatMessage.godfatherBackupKilled', playerName(players, variant.backup));
    case 'playerRoleAndAlibi':
      return text(
        'chatMessage.playerRoleAndAlibi',
        playerName(players, variant.player),
        roleName(variant.role),
        replaceMentions(variant.will, players, roleList)
      );
    case 'informantResult':
      return text(
        'chatMessage.informantResult',
        playerName(players, variant.player),
        roleName(variant.role),
        text('chatMessage.informantResult.visited', playerList(players, variant.visited)),
        text('chatMessage.informantResult.visitedBy', playerList(players, variant.visitedBy)),
        text('chatMessage.informantResult.winCondition', winConditionName(variant.winCondition))
      );
    case 'ambusherCaught':
      return text('chatMessage.ambusherCaught', playerName(players, variant.ambusher));
    case 'targetsMessage':
      return `${text('chatMessage.targetsMessage')}\n${formatVariant(variant.message, players, roleList, options)}`;
    case 'playerForwardedMessage':
      return `${text('chatMessage.playerForwardedMessage', playerName(players, variant.forwarder))}\n${formatVariant(variant.message, players, roleList, options)}`;
    case 'targetHasRole':
      return text('chatMessage.targetHasRole', roleName(variant.role));
    case 'targetHasWinCondition':
      return text('chatMessage.targetHasWinCondition', winConditionName(variant.winCondition));
    case 'werewolfTrackingResult':
      return text(
        'chatMessage.werewolfTrackingResult',
        playerName(players, variant.trackedPlayer),
        playerList(players, variant.players)
      );
    case 'chronokaiserSpeedUp':
      return text('chatMessage.chronokaiserSpeedUp', variant.percent);
    case 'mercenaryResult':
      return text(`chatMessage.mercenaryResult.${variant.hit ? 'hit' : 'notHit'}`);
    case 'mercenaryHits':
      return text('chatMessage.mercenaryHits', roleListName(variant.roles));
    case 'kiraResult':
      return formatKiraResult(variant, players);
    case 'martyrRevealed':
      return text('chatMessage.martyrRevealed', playerName(players, variant.martyr));
    case 'wildcardConvertFailed':
      return text('chatMessage.wildcardConvertFailed', roleName(variant.role));
    case 'phaseFastForwarded':
    case 'invalidWhisper':
    case 'politicianCountdownStarted':
    case 'mediumExists':
    case 'deputyShotYou':
    case 'werewolfTracked':
    case 'yourConvertFailed':
    case 'addedToNiceList':
    case 'addedToNaughtyList':
    case 'someoneSurvivedYourAttack':
    case 'youSurvivedAttack':
    case 'youGuardedSomeone':
    case 'youWereGuarded':
    case 'youDied':
    case 'youWereAttacked':
    case 'youAttackedSomeone':
    case 'youArePoisoned':
    case 'roleBlocked':
    case 'wardblocked':
    case 'psychicFailed':
    case 'transported':
    case 'silenced':
    case 'brained':
    case 'youWerePossessed':
    case 'revolutionaryWon':
    case 'mercenaryYouAreAHit':
    case 'pawnVisitedYou':
    case 'martyrWon':
    case 'martyrFailed':
      return text(`chatMessage.${variant.type}`);
  }

  const unhandledVariant: never = variant;
  return unhandledVariant;
}

export function formatChatMessage(
  message: ChatMessage,
  players: string[],
  roleList: RoleList,
  options: ChatFormatOptions = {}
): string {
  return formatVariant(message.variant, players, roleList, options);
}

export function chatMessageClass(message: ChatMessage): string {
  return chatMessageStyles[message.variant.type] ?? '';
}

export function chatTone(message: ChatMessage): 'normal' | 'private' | 'danger' | 'system' {
  const classes = chatMessageClass(message).split(' ');
  if (classes.includes('discreet')) {
    return 'private';
  }
  if (message.variant.type === 'playerDied' || message.variant.type === 'gameOver') {
    return 'danger';
  }
  if (message.variant.type === 'normal' || message.variant.type === 'lobbyMessage') {
    return 'normal';
  }

  return 'system';
}

export function verdictName(verdict: Verdict): string {
  return text(`verdict.${verdict}`);
}

export function roomCode(value: number): string {
  return value.toString(18).toUpperCase();
}
