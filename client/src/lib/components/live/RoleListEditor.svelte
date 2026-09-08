<script lang="ts">
  import Icon from '../Icon.svelte';
  import StyledText from '../StyledText.svelte';
  import Select from '../Select.svelte';
  import Popover from '../Popover.svelte';
  import '../outlineSelector.css';
  import type { RoleList, RoleOutlineOption } from '$lib/game/role-list';
  import {
    allRoles,
    CONCLUSIONS,
    INSIDER_GROUPS,
    ROLE_SETS,
    type Conclusion,
    type InsiderGroup,
    type Role,
    type RoleSet
  } from '$lib/game/roles';
  import { conclusionName, playerName, roleName, roleOutlineName, text } from '$lib/live/format';

  interface Props {
    roleList: RoleList;
    players?: string[];
    disabled?: boolean;
    onChange: (roleList: RoleList) => void;
  }

  let { roleList, players = [], disabled = false, onChange }: Props = $props();

  function cloneList(): RoleList {
    return structuredClone(roleList);
  }

  function replaceOption(outlineIndex: number, optionIndex: number, option: RoleOutlineOption): void {
    const next = cloneList();
    next[outlineIndex][optionIndex] = option;
    onChange(next);
  }

  function keepConstraints(source: RoleOutlineOption): Omit<RoleOutlineOption, 'role' | 'roleSet'> {
    const constraints: Omit<RoleOutlineOption, 'role' | 'roleSet'> = {};
    if (source.winIfAny) constraints.winIfAny = source.winIfAny;
    if (source.insiderGroups) constraints.insiderGroups = source.insiderGroups;
    if (source.playerPool) constraints.playerPool = source.playerPool;
    return constraints;
  }

  function changeKind(outlineIndex: number, optionIndex: number, kind: 'role' | 'roleSet'): void {
    const current = roleList[outlineIndex][optionIndex];
    const next: RoleOutlineOption = kind === 'role'
      ? { ...keepConstraints(current), role: allRoles()[0] }
      : { ...keepConstraints(current), roleSet: 'any' };
    replaceOption(outlineIndex, optionIndex, next);
  }

  function changeTarget(outlineIndex: number, optionIndex: number, value: string): void {
    const current = roleList[outlineIndex][optionIndex];
    const next: RoleOutlineOption = 'role' in current
      ? { ...keepConstraints(current), role: value as Role }
      : { ...keepConstraints(current), roleSet: value as RoleSet };
    replaceOption(outlineIndex, optionIndex, next);
  }

  function toggleArrayValue<T extends string>(values: T[] | undefined, value: T, checked: boolean): T[] {
    const next = (values ?? []).filter((item) => item !== value);
    if (checked) next.push(value);
    return next;
  }

  function togglePlayer(outlineIndex: number, optionIndex: number, index: number, checked: boolean): void {
    const current = roleList[outlineIndex][optionIndex];
    const pool = (current.playerPool ?? []).filter((player) => player !== index);
    if (checked) pool.push(index);
    replaceOption(outlineIndex, optionIndex, { ...current, playerPool: pool });
  }

  function toggleGroup(outlineIndex: number, optionIndex: number, group: InsiderGroup, checked: boolean): void {
    const current = roleList[outlineIndex][optionIndex];
    replaceOption(outlineIndex, optionIndex, {
      ...current,
      insiderGroups: toggleArrayValue(current.insiderGroups, group, checked)
    });
  }

  function toggleConclusion(outlineIndex: number, optionIndex: number, conclusion: Conclusion, checked: boolean): void {
    const current = roleList[outlineIndex][optionIndex];
    replaceOption(outlineIndex, optionIndex, {
      ...current,
      winIfAny: toggleArrayValue(current.winIfAny, conclusion, checked)
    });
  }

  function clearConstraint(outlineIndex: number, optionIndex: number, key: 'playerPool' | 'insiderGroups' | 'winIfAny'): void {
    const current = roleList[outlineIndex][optionIndex];
    const next = { ...current };
    delete next[key];
    replaceOption(outlineIndex, optionIndex, next);
  }

  function addOption(outlineIndex: number): void {
    const next = cloneList();
    next[outlineIndex].push({ roleSet: 'any' });
    onChange(next);
  }

  function removeOption(outlineIndex: number, optionIndex: number): void {
    const next = cloneList();
    if (next[outlineIndex].length === 1) {
      next[outlineIndex] = [{ roleSet: 'any' }];
      onChange(next);
      return;
    }
    next[outlineIndex].splice(optionIndex, 1);
    onChange(next);
  }

  function moveOutline(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= roleList.length) return;
    const next = cloneList();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  let dragging = $state<number | null>(null);
  const options = [...ROLE_SETS.map(set => ({value: 'set:' + set, label: text(set)})), ...allRoles().map(role => ({value: 'role:' + role, label: roleName(role)}))];
  function choose(outlineIndex: number, optionIndex: number, value: string): void {
    const constraints = keepConstraints(roleList[outlineIndex][optionIndex]);
    if (value.startsWith('role:')) replaceOption(outlineIndex, optionIndex, {...constraints, role: value.slice(5) as Role});
    else replaceOption(outlineIndex, optionIndex, {...constraints, roleSet: value.slice(4) as RoleSet});
  }
</script>

<div class="role-list-setter-list">
  {#each roleList as outline, outlineIndex}
    <div class="draggable" draggable={!disabled} role="group" aria-label={'Outline ' + (outlineIndex + 1)} ondragstart={() => dragging = outlineIndex} ondragover={event => event.preventDefault()} ondrop={event => {event.preventDefault(); if (disabled || dragging === null) return; const next = cloneList(); const [entry] = next.splice(dragging, 1); next.splice(outlineIndex, 0, entry); dragging = null; onChange(next);}} ondragend={() => dragging = null}>
      <div class="role-list-setter-outline-div">
        {#if disabled}<div class="placard"><StyledText value={roleOutlineName(outline, players)} {players} /></div>
        {:else}
          <Icon>drag_indicator</Icon>
          <div class="role-picker">
            {#each outline as option, optionIndex}
              <div class="role-picker-option">
                <Popover>
                  {#snippet trigger(toggle)}<button class="button" aria-label="Player pool" onclick={toggle}>{#if option.playerPool === undefined}<Icon>diversity_1</Icon>{:else if !option.playerPool.length}<Icon>person_off</Icon>{:else}<StyledText value={option.playerPool.map(index => playerName(players, index)).join(', ')} noLinks />{/if}</button>:{/snippet}
                  {#if option.playerPool === undefined}<button class="button" onclick={() => replaceOption(outlineIndex, optionIndex, {...option, playerPool: [0]})}>{text('setNotDefault')}</button>
                  {:else}<button class="button" onclick={() => clearConstraint(outlineIndex, optionIndex, 'playerPool')}>{text('setDefault')}</button>{#each players as name, index}<button class="button" class:highlighted={option.playerPool.includes(index)} onclick={() => togglePlayer(outlineIndex, optionIndex, index, !option.playerPool?.includes(index))}><StyledText value={name} noLinks /></button>{/each}{/if}
                </Popover><Popover>
                  {#snippet trigger(toggle)}<button class="button" aria-label="Insider groups" onclick={toggle}>{#if option.insiderGroups === undefined}<Icon>chat_bubble_outline</Icon>{:else}<StyledText value={option.insiderGroups.map(group => text('chatGroup.' + group + '.icon')).join(text('union')) || text('chatGroup.all.icon')} noLinks />{/if}</button>,{/snippet}
                  {#if option.insiderGroups === undefined}<button class="button" onclick={() => replaceOption(outlineIndex, optionIndex, {...option, insiderGroups: ['mafia']})}>{text('setNotDefault')}</button>
                  {:else}<button class="button" onclick={() => clearConstraint(outlineIndex, optionIndex, 'insiderGroups')}>{text('setDefault')}</button>{#each INSIDER_GROUPS as group}<button class="button" class:highlighted={option.insiderGroups.includes(group)} onclick={() => toggleGroup(outlineIndex, optionIndex, group, !option.insiderGroups?.includes(group))}><StyledText value={text(group)} noLinks /></button>{/each}{/if}
                </Popover><Popover>
                  {#snippet trigger(toggle)}<button class="button" aria-label="Win conditions" onclick={toggle}>{#if option.winIfAny === undefined}<Icon>emoji_events</Icon>{:else}<StyledText value={option.winIfAny.map(conclusionName).join(text('union'))} noLinks />{/if}</button>,{/snippet}
                  {#if option.winIfAny === undefined}<button class="button" onclick={() => replaceOption(outlineIndex, optionIndex, {...option, winIfAny: ['town']})}>{text('setNotDefault')}</button>
                  {:else}<button class="button" onclick={() => clearConstraint(outlineIndex, optionIndex, 'winIfAny')}>{text('setDefault')}</button>{#each CONCLUSIONS as conclusion}<button class="button" class:highlighted={option.winIfAny.includes(conclusion)} onclick={() => toggleConclusion(outlineIndex, optionIndex, conclusion, !option.winIfAny?.includes(conclusion))}><StyledText value={conclusionName(conclusion)} noLinks /></button>{/each}{/if}
                </Popover><Select value={'role' in option ? 'role:' + option.role : 'set:' + option.roleSet} {options} onchange={value => choose(outlineIndex, optionIndex, value)} />
                <button class="button" aria-label="Remove alternative" onclick={() => removeOption(outlineIndex, optionIndex)}><Icon size="tiny">remove</Icon></button>
              </div>
            {/each}
            <button class="button" aria-label="Add alternative" onclick={() => addOption(outlineIndex)}><Icon size="tiny">add</Icon></button>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
