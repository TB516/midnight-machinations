import englishSource from "$lib/../resources/lang/en_us.json";
import dummyNamesSource from "$lib/../resources/dummyNames.json";
import dummyRoleListSource from "$lib/../resources/dummyRoleList.json";
import rolesSource from "$lib/../resources/roles.json";
import { markdownToPlainText } from "$lib/wiki/markdown";
import {
    WIKI_CATEGORIES,
    WIKI_KINDS,
    type WikiArticle,
    type WikiArticleId,
    type WikiArticleSummary,
    type WikiCategory,
    type WikiCategoryGroup,
    type WikiEntry,
    type WikiExample,
    type WikiIndexGroup,
    type WikiKind,
    type WikiSection,
} from "$lib/wiki/types";

interface WinConditionData {
    type: string;
    winIfAny?: string[];
}

type VisitTagData =
    | { type: "ability"; ability: { role: string } }
    | { type: "appeared" }
    | { type: "syndicateGun" }
    | { type: "syndicateBackupAttack" };

interface KiraResultData {
    guesses: Array<[number, [string, string]]>;
}

const DIRECT_CHAT_EXAMPLE_TYPES = [
    "addedToNaughtyList",
    "addedToNiceList",
    "brained",
    "deputyShotYou",
    "invalidWhisper",
    "martyrFailed",
    "martyrWon",
    "mediumExists",
    "mercenaryYouAreAHit",
    "pawnVisitedYou",
    "politicianCountdownStarted",
    "psychicFailed",
    "revolutionaryWon",
    "roleBlocked",
    "silenced",
    "someoneSurvivedYourAttack",
    "transported",
    "wardblocked",
    "werewolfTracked",
    "youAttackedSomeone",
    "youGuardedSomeone",
    "youSurvivedAttack",
    "youWereAttacked",
    "youWereGuarded",
    "youWerePossessed",
    "yourConvertFailed",
] as const;

type DirectChatExampleType = (typeof DIRECT_CHAT_EXAMPLE_TYPES)[number];
type NormalMessageSender =
    | { type: "jailor" }
    | { type: "reporter" }
    | { type: "livingToDead"; player: number }
    | { type: "player"; player: number };

/** Discriminated shape of every chat example currently bundled in roles.json. */
type ChatExampleData =
    | { type: DirectChatExampleType }
    | { type: "normal"; text: string; messageSender: NormalMessageSender; chatGroup: string; block: boolean }
    | { type: "ambusherCaught"; ambusher: number }
    | { type: "auditorResult"; outlineIndex: number; result: string[] }
    | { type: "chronokaiserSpeedUp"; percent: string | number }
    | { type: "cultSacrificeCount"; count: number }
    | { type: "deputyKilled"; shot: number }
    | { type: "detectiveResult"; suspicious: boolean }
    | { type: "dreamwalkerResult"; result: string[] }
    | { type: "dreamwalkerTarget"; target: number }
    | { type: "fragileVestBreak"; playerWithVest: number; defense: string }
    | { type: "gainedRoleAbility" | "roleAssignment"; role: string }
    | { type: "godfatherBackup"; backup: number | null }
    | { type: "godfatherBackupKilled"; backup: number }
    | { type: "gossipResult" | "seerResult"; enemies: boolean }
    | {
        type: "informantResult";
        player: number;
        role: string;
        visitedBy: number[];
        visited: number[];
        winCondition: WinConditionData;
    }
    | { type: "jailedSomeone" | "jailedTarget" | "playerEnfranchised" | "playerIsBeingInterviewed"; playerIndex: number }
    | { type: "kiraResult"; result: KiraResultData }
    | { type: "lookoutResult" | "spyMafiaVisit" | "trackerResult"; players: number[] }
    | { type: "martyrRevealed"; martyr: number }
    | { type: "mediumHauntStarted" | "mediumSeance"; medium: number; player: number }
    | { type: "mercenaryHits"; roles: string[] }
    | { type: "mercenaryResult"; hit: boolean }
    | { type: "nextKrampusAbility" | "nextSantaAbility"; ability: string }
    | { type: "playerRoleAndAlibi"; player: number; role: string; will: string }
    | { type: "playersRoleConcealed"; player: number }
    | { type: "playersRoleRevealed"; player: number; role: string }
    | { type: "polymathSnoopResult"; inno: boolean }
    | { type: "psychicEvil"; first: number; second: number }
    | { type: "psychicGood"; player: number }
    | { type: "puppeteerPlayerIsNowMarionette" | "recruiterPlayerIsNowRecruit" | "santaAddedPlayerToNaughtyList"; player: number }
    | { type: "reporterReport"; report: string }
    | { type: "snoopResult"; townie: boolean }
    | { type: "spyBug"; visitTags: VisitTagData[] }
    | { type: "tallyClerkResult"; evilCount: number }
    | { type: "targetHasRole"; role: string }
    | { type: "targetHasWinCondition"; winCondition: WinConditionData }
    | { type: "targetsMessage"; message: ChatExampleData }
    | { type: "trapState" | "trapStateEndOfNight"; state: { type: string } }
    | { type: "wardenPlayersImprisoned"; players: number[] }
    | { type: "werewolfTrackingResult"; trackedPlayer: number; players: number[] }
    | { type: "wildcardConvertFailed"; role: string }
    | { type: "witnessesCalled"; playerOnTrial: number; witnesses: number[] };

interface RoleData {
    mainRoleSet: "town" | "mafia" | "cult" | "neutral" | "minions" | "fiends";
    roleSets: string[];
    armor: boolean;
    aura: string | null;
    maxCount: number | null;
    canWriteCallingCard: boolean;
    chatMessages: ChatExampleData[];
}

interface RoleOutlineOption {
    role?: string;
    roleSet?: string;
    playerPool?: number[];
    insiderGroups?: string[];
    winIfAny?: string[];
}

const ENGLISH = englishSource as Record<string, string>;
const ROLES = rolesSource as unknown as Record<string, RoleData>;
const DUMMY_NAMES = dummyNamesSource as string[];
const DUMMY_ROLE_LIST = dummyRoleListSource as RoleOutlineOption[][];

/** Modifier IDs represented by static wiki articles. */
export const MODIFIER_IDS = [
    "obscuredGraves",
    "skipDay1",
    "deadCanChat",
    "abstaining",
    "noDeathCause",
    "roleSetGraveKillers",
    "autoGuilty",
    "twoThirdsMajority",
    "noMajority",
    "noTrialPhases",
    "noWhispers",
    "hiddenWhispers",
    "noNightChat",
    "noChat",
    "unscheduledNominations",
    "hiddenNominationVotes",
    "hiddenVerdictVotes",
    "forfeitNominationVote",
    "randomPlayerNames",
    "customRoleLimits",
] as const;

/** Canonical display order for role-set collections. */
export const ROLE_SET_IDS = [
    "any",
    "town",
    "townCommon",
    "townInvestigative",
    "townProtective",
    "townKilling",
    "townSupport",
    "mafia",
    "mafiaKilling",
    "mafiaSupport",
    "neutral",
    "minions",
    "fiends",
    "cult",
] as const;

const GENERATED_ARTICLE_IDS = ["roleSet", "all_text"] as const;

const STANDARD_ARTICLE_IDS = Array.from(
    new Set(
        Object.keys(ENGLISH)
            .filter((key) => key.startsWith("wiki.article.standard."))
            .map((key) => key.split(".")[3]),
    ),
).sort((left, right) => left.localeCompare(right));

const ROLE_IDS = Object.keys(ROLES).sort((left, right) => {
    const leftSet = ROLE_SET_IDS.indexOf(ROLES[left].mainRoleSet);
    const rightSet = ROLE_SET_IDS.indexOf(ROLES[right].mainRoleSet);

    if (leftSet !== rightSet) {
        return leftSet - rightSet;
    }

    return translate(`role.${left}.name`).localeCompare(translate(`role.${right}.name`));
});

const ARTICLE_IDS: WikiArticleId[] = [
    ...WIKI_CATEGORIES.map((category) => `category/${category}` as const),
    ...ROLE_IDS.map((role) => `role/${role}` as const),
    ...MODIFIER_IDS.map((modifier) => `modifier/${modifier}` as const),
    ...STANDARD_ARTICLE_IDS.map((article) => `standard/${article}` as const),
    ...GENERATED_ARTICLE_IDS.map((article) => `generated/${article}` as const),
];

const ARTICLE_ID_SET = new Set<string>(ARTICLE_IDS);

/** Total number of static article routes generated from the bundled data. */
export const WIKI_ARTICLE_COUNT = ARTICLE_IDS.length;

const EXPECTED_ARTICLE_COUNT =
    WIKI_CATEGORIES.length
    + ROLE_IDS.length
    + MODIFIER_IDS.length
    + STANDARD_ARTICLE_IDS.length
    + GENERATED_ARTICLE_IDS.length;

if (ARTICLE_IDS.length !== EXPECTED_ARTICLE_COUNT || ARTICLE_ID_SET.size !== ARTICLE_IDS.length) {
    throw new Error("The wiki catalog contains a missing or duplicate article ID");
}

const ABILITY_ARTICLES = new Set([
    "standard/backup",
    "standard/block",
    "standard/convert",
    "standard/douse",
    "standard/forged",
    "standard/frame",
    "standard/haunt",
    "standard/hypnotize",
    "standard/interview",
    "standard/detain",
    "standard/marionette",
    "standard/obscured",
    "standard/possess",
    "standard/guard",
    "standard/fragileVest",
    "standard/rampage",
    "standard/report",
    "standard/roleblock",
    "standard/silenced",
    "standard/spiral",
    "standard/syndicateGun",
    "standard/transport",
    "standard/ward",
    "standard/forfeitNominationVote",
    "standard/aura",
    "standard/fastForward",
    "standard/appearedVisit",
    "standard/defense",
    "standard/confused",
    "standard/trial",
]);

const STRATEGY_ARTICLES = new Set([
    "standard/claim",
    "standard/claimswap",
    "standard/vfr",
    "standard/passcode",
]);

const MENU_ARTICLES = new Set([
    "standard/playerList",
    "standard/gameMode",
    "standard/outlineList",
    "standard/alibi",
    "standard/chat",
    "standard/controller",
]);

const PHASE_ARTICLES = new Set([
    "category/trial",
    "standard/briefing",
    "standard/night",
    "standard/obituary",
    "standard/discussion",
    "standard/nomination",
    "standard/adjournment",
    "standard/testimony",
    "standard/judgement",
    "standard/dusk",
    "standard/finalWords",
]);

const TRIAL_ARTICLES = new Set([
    "standard/nomination",
    "standard/adjournment",
    "standard/testimony",
    "standard/judgement",
    "standard/finalWords",
]);

function translate(key: string, ...values: Array<string | number>): string {
    let output = ENGLISH[key] ?? key;

    values.forEach((value, index) => {
        output = output.replaceAll(`\\${index}`, String(value));
    });

    return output;
}

function translateOptional(key: string, ...values: Array<string | number>): string | null {
    if (!(key in ENGLISH)) {
        return null;
    }

    return translate(key, ...values);
}

function splitArticleId(id: WikiArticleId): [WikiKind, string] {
    const slash = id.indexOf("/");
    return [id.slice(0, slash) as WikiKind, id.slice(slash + 1)];
}

function getArticleTitle(id: WikiArticleId): string {
    const [kind, slug] = splitArticleId(id);

    switch (kind) {
        case "category":
            return translate(`wiki.category.${slug}`);
        case "role":
            return translate(`role.${slug}.name`);
        case "modifier":
            return translate(`wiki.article.modifier.${slug}.title`);
        case "standard":
            return translate(`wiki.article.standard.${slug}.title`);
        case "generated":
            return translate(`wiki.article.generated.${slug}.title`);
    }
}

function getCategories(id: WikiArticleId): WikiCategoryGroup[] {
    const [kind, slug] = splitArticleId(id);
    const categories: WikiCategory[] = [];

    if (kind === "role") {
        categories.push(ROLES[slug].mainRoleSet);
    } else if (kind === "modifier") {
        categories.push("modifiers");
    } else if (kind === "category") {
        categories.push("categories");
    }

    if (id === "standard/mafia") {
        categories.push("mafia");
    } else if (id === "standard/cult") {
        categories.push("cult");
    }

    if (ABILITY_ARTICLES.has(id)) {
        categories.push("abilities");
    }
    if (STRATEGY_ARTICLES.has(id)) {
        categories.push("strategies");
    }
    if (MENU_ARTICLES.has(id)) {
        categories.push("menus");
    }
    if (PHASE_ARTICLES.has(id)) {
        categories.push("phases");
    }
    if (TRIAL_ARTICLES.has(id)) {
        categories.push("trial");
    }

    return categories.length === 0 ? ["uncategorized"] : categories;
}

function roleSearchMarkdown(role: string): string {
    const roleData = ROLES[role];

    return [
        translateOptional(`wiki.article.role.${role}.reminder`) ?? "",
        translateOptional(`wiki.article.role.${role}.lore`) ?? "",
        translateOptional(`wiki.article.role.${role}.guide`) ?? "",
        translateOptional(`wiki.article.role.${role}.abilities`) ?? "",
        translateOptional(`wiki.article.role.${role}.attributes`) ?? "",
        translateOptional(`wiki.article.role.${role}.extra`) ?? "",
        ...roleData.roleSets.map((roleSet) => translate(roleSet)),
    ].join("\n");
}

function getArticleMarkdown(id: WikiArticleId): string {
    const [kind, slug] = splitArticleId(id);

    switch (kind) {
        case "category":
            return translateOptional(`wiki.category.${slug}.text`) ?? "";
        case "role":
            return roleSearchMarkdown(slug);
        case "modifier":
            return translate(`wiki.article.modifier.${slug}.text`);
        case "standard":
            return translate(`wiki.article.standard.${slug}.text`);
        case "generated":
            if (slug === "roleSet") {
                return ROLE_SET_IDS.filter((roleSet) => roleSet !== "any")
                    .map((roleSet) => `${translate(roleSet)}\n${translateOptional(`${roleSet}.description`) ?? ""}`)
                    .join("\n");
            }
            return translate("wiki.article.generated.all_text.title");
    }
}

function assertArticleSourceIsComplete(id: WikiArticleId): void {
    const [kind, slug] = splitArticleId(id);
    const requiredKeys = [`wiki.article.${kind}.${slug}.title`];

    switch (kind) {
        case "category":
            requiredKeys.splice(0, 1, `wiki.category.${slug}`, `wiki.category.${slug}.text`);
            break;
        case "role":
            requiredKeys.splice(0, 1, `role.${slug}.name`);
            break;
        case "modifier":
        case "standard":
            requiredKeys.push(`wiki.article.${kind}.${slug}.text`);
            break;
        case "generated":
            break;
    }

    const missingKey = requiredKeys.find((key) => !(key in ENGLISH));
    if (missingKey) {
        throw new Error(`Wiki article ${id} is missing translation key ${missingKey}`);
    }
}

function createSummary(id: WikiArticleId): WikiArticleSummary {
    const [kind, slug] = splitArticleId(id);
    const title = getArticleTitle(id);
    const plainText = markdownToPlainText(getArticleMarkdown(id));

    return {
        id,
        kind,
        slug,
        title,
        href: `/wiki/${kind}/${slug}`,
        categories: getCategories(id),
        excerpt: plainText.length > 180 ? `${plainText.slice(0, 177).trimEnd()}...` : plainText,
        searchText: `${title} ${plainText}`.toLocaleLowerCase("en-US"),
    };
}

ARTICLE_IDS.forEach(assertArticleSourceIsComplete);

const ARTICLE_SUMMARIES = ARTICLE_IDS.map(createSummary);
const SUMMARY_BY_ID = new Map(ARTICLE_SUMMARIES.map((article) => [article.id, article]));

function roleName(role: string): string {
    return translate(`role.${role}.name`);
}

function playerName(index: number): string {
    return DUMMY_NAMES[index] ?? `Player ${index + 1}`;
}

function playerList(players: number[]): string {
    if (players.length === 0) {
        return translate("nobody");
    }

    return players.map(playerName).join(", ");
}

function roleList(roles: string[]): string {
    if (roles.length === 0) {
        return translate("none");
    }

    return roles.map(roleName).join(", ");
}

function humanize(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/^./, (letter) => letter.toUpperCase());
}

function describeWinCondition(winCondition: WinConditionData): string {
    if (winCondition?.type === "roleStateWon") {
        return translate("winCondition.independent");
    }

    const conclusions = winCondition?.winIfAny as string[] | undefined;
    if (!conclusions || conclusions.length === 0) {
        return translate("winCondition.loser");
    }

    return conclusions.map((conclusion) => translate(conclusion)).join(` ${translate("union")} `);
}

function describeVisitTags(visitTags: VisitTagData[]): string {
    if (visitTags.length === 0) {
        return translate("none");
    }

    return visitTags
        .map((tag) => {
            if (tag.type === "ability") {
                return roleName(tag.ability.role);
            }
            if (tag.type === "appeared") {
                return translate("visitTag.appeared.name");
            }
            return translate("visitTag.syndicateGun.name");
        })
        .join(", ");
}

function formatKiraResult(message: Extract<ChatExampleData, { type: "kiraResult" }>): string {
    return message.result.guesses
        .map(([player, [guess, result]]) => {
            const guessName = guess === "nonTown" ? translate("nonTown") : roleName(guess);
            const resultText = translateOptional(`kiraResult.${result}`) ?? humanize(result);
            return `${playerName(player)}: ${guessName}, ${resultText}`;
        })
        .join("\n");
}

function formatChatExample(message: ChatExampleData): string {
    switch (message.type) {
        case "normal":
            return replaceMentions(message.text);
        case "roleAssignment":
        case "gainedRoleAbility":
            return translate(`chatMessage.${message.type}`, roleName(message.role));
        case "playersRoleRevealed":
            return translate("chatMessage.playersRoleRevealed", playerName(message.player), roleName(message.role));
        case "playersRoleConcealed":
            return translate("chatMessage.playersRoleConcealed", playerName(message.player));
        case "playerEnfranchised":
        case "playerIsBeingInterviewed":
            return translate(`chatMessage.${message.type}`, playerName(message.playerIndex));
        case "jailedTarget":
        case "jailedSomeone":
            return translate(`chatMessage.${message.type}`, playerName(message.playerIndex));
        case "wardenPlayersImprisoned":
            return translate("chatMessage.wardenPlayersImprisoned", playerList(message.players));
        case "deputyKilled":
            return translate("chatMessage.deputyKilled", playerName(message.shot));
        case "puppeteerPlayerIsNowMarionette":
        case "recruiterPlayerIsNowRecruit":
        case "santaAddedPlayerToNaughtyList":
            return translate(`chatMessage.${message.type}`, playerName(message.player));
        case "godfatherBackup":
            return message.backup === null
                ? translate("chatMessage.godfatherBackup.nobody")
                : translate("chatMessage.godfatherBackup", playerName(message.backup));
        case "godfatherBackupKilled":
            return translate("chatMessage.godfatherBackupKilled", playerName(message.backup));
        case "detectiveResult":
            return translate(`chatMessage.detectiveResult.${message.suspicious ? "suspicious" : "innocent"}`);
        case "snoopResult":
            return translate(`chatMessage.snoopResult.${message.townie ? "townie" : "inconclusive"}`);
        case "polymathSnoopResult":
            return translate(message.inno ? "chatMessage.detectiveResult.innocent" : "chatMessage.snoopResult.inconclusive");
        case "gossipResult":
            return translate(`chatMessage.gossipResult.${message.enemies ? "enemies" : "none"}`);
        case "tallyClerkResult":
            return translate("chatMessage.tallyClerkResult", message.evilCount);
        case "dreamwalkerTarget":
            return translate("chatMessage.dreamwalkerTarget", playerName(message.target));
        case "dreamwalkerResult":
            return message.result.length === 0
                ? translate("chatMessage.dreamwalkerResult.none")
                : translate("chatMessage.dreamwalkerResult", roleList(message.result));
        case "lookoutResult":
        case "spyMafiaVisit":
        case "trackerResult":
            return translate(`chatMessage.${message.type}`, playerList(message.players));
        case "spyBug":
            return translate("chatMessage.spyBug", describeVisitTags(message.visitTags));
        case "seerResult":
            return translate(`chatMessage.seerResult.${message.enemies ? "enemies" : "friends"}`);
        case "psychicEvil":
            return translate("chatMessage.psychicEvil", playerName(message.first), playerName(message.second));
        case "psychicGood":
            return translate("chatMessage.psychicGood", playerName(message.player));
        case "auditorResult":
            return translate("chatMessage.auditorResult", message.outlineIndex + 1, roleList(message.result));
        case "trapState":
        case "trapStateEndOfNight":
            return translate(`chatMessage.${message.type}.${message.state.type}`);
        case "playerRoleAndAlibi":
            return translate(
                "chatMessage.playerRoleAndAlibi",
                playerName(message.player),
                roleName(message.role),
                replaceMentions(message.will),
            );
        case "informantResult":
            return translate(
                "chatMessage.informantResult",
                playerName(message.player),
                roleName(message.role),
                translate("chatMessage.informantResult.visited", playerList(message.visited)),
                translate("chatMessage.informantResult.visitedBy", playerList(message.visitedBy)),
                translate("chatMessage.informantResult.winCondition", describeWinCondition(message.winCondition)),
            );
        case "ambusherCaught":
            return translate("chatMessage.ambusherCaught", playerName(message.ambusher));
        case "mercenaryHits":
            return translate("chatMessage.mercenaryHits", roleList(message.roles));
        case "mercenaryResult":
            return translate(`chatMessage.mercenaryResult.${message.hit ? "hit" : "notHit"}`);
        case "mediumHauntStarted":
        case "mediumSeance":
            return translate(`chatMessage.${message.type}`, playerName(message.medium), playerName(message.player));
        case "targetHasRole":
            return translate("chatMessage.targetHasRole", roleName(message.role));
        case "targetHasWinCondition":
            return translate("chatMessage.targetHasWinCondition", describeWinCondition(message.winCondition));
        case "werewolfTrackingResult":
            return translate("chatMessage.werewolfTrackingResult", playerName(message.trackedPlayer), playerList(message.players));
        case "wildcardConvertFailed":
            return translate("chatMessage.wildcardConvertFailed", roleName(message.role));
        case "chronokaiserSpeedUp":
            return translate("chatMessage.chronokaiserSpeedUp", message.percent);
        case "nextSantaAbility":
        case "nextKrampusAbility":
            return translate(`chatMessage.${message.type}.${message.ability}`);
        case "fragileVestBreak":
            return translate("chatMessage.fragileVestBreak", translate(`defense.${message.defense}`), playerName(message.playerWithVest));
        case "cultSacrificeCount":
            return translate("chatMessage.cultSacrificeCount", message.count);
        case "reporterReport":
            return translate("chatMessage.reporterReport", replaceMentions(message.report));
        case "martyrRevealed":
            return translate("chatMessage.martyrRevealed", playerName(message.martyr));
        case "witnessesCalled":
            return translate("chatMessage.witnessesCalled", playerName(message.playerOnTrial), playerList(message.witnesses));
        case "targetsMessage":
            return `${translate("chatMessage.targetsMessage")}\n${formatChatExample(message.message)}`;
        case "kiraResult":
            return formatKiraResult(message);
        default:
            return translateOptional(`chatMessage.${message.type}`) ?? humanize(message.type);
    }
}

function formatExampleLabel(message: ChatExampleData, index: number): string {
    if (message.type !== "normal") {
        return `Example ${index + 1}`;
    }

    switch (message.messageSender.type) {
        case "player":
        case "livingToDead":
            return playerName(message.messageSender.player);
        case "jailor":
            return roleName("jailor");
        case "reporter":
            return roleName("reporter");
    }
}

function translateRoleOutlineOption(option: RoleOutlineOption): string {
    let prefix = "";

    if (option.playerPool) {
        prefix += `${playerList(option.playerPool)}: `;
    }
    if (option.insiderGroups) {
        const groups = option.insiderGroups.length === 0
            ? translate("chatGroup.all.icon")
            : option.insiderGroups.map((group) => translate(`chatGroup.${group}.icon`)).join(` ${translate("union")} `);
        prefix += `${groups}, `;
    }
    if (option.winIfAny) {
        prefix += `${describeWinCondition({ type: "gameConclusionReached", winIfAny: option.winIfAny })}, `;
    }

    if (option.roleSet) {
        return prefix + translate(option.roleSet);
    }

    return prefix + roleName(option.role ?? "");
}

function translateRoleOutline(outline: RoleOutlineOption[]): string {
    return outline
        .map(translateRoleOutlineOption)
        .join(` ${translate("union:var.0")} `);
}

function replaceMentions(source: string): string {
    return source
        .replace(/@o(\d+)/g, (match, number: string) => {
            const index = Number.parseInt(number, 10) - 1;
            const outline = DUMMY_ROLE_LIST[index];
            return outline ? `${index + 1}: ${translateRoleOutline(outline)}` : match;
        })
        .replace(/@(\d+)/g, (match, number: string) => {
            const name = DUMMY_NAMES[Number.parseInt(number, 10) - 1];
            return name ?? match;
        });
}

function getRoleArticle(summary: WikiArticleSummary): WikiArticle {
    const roleData = ROLES[summary.slug];
    const reminder = replaceMentions(
        translateOptional(`wiki.article.role.${summary.slug}.reminder`)
            ?? translate("wiki.article.role.noReminder"),
    );
    const lore = translateOptional(`wiki.article.role.${summary.slug}.lore`);
    const guide = replaceMentions(
        translateOptional(`wiki.article.role.${summary.slug}.guide`)
            ?? translate("wiki.article.role.noGuide"),
    );
    const markdownParts = [`## ${translate("wiki.article.role.reminder")}\n${reminder}`];

    if (lore) {
        markdownParts.push(`## ${translate("wiki.article.role.lore")}\n${replaceMentions(lore)}`);
    }

    markdownParts.push(`## ${translate("wiki.article.role.guide")}\n${guide}`);

    const facts = [];
    if (roleData.aura) {
        facts.push({
            label: translate("wiki.article.standard.aura.title"),
            value: translate(`${roleData.aura}Aura`),
        });
    }
    if (roleData.armor) {
        facts.push({ label: translate("defense"), value: translate("defense.armored") });
    }
    if (roleData.maxCount !== null) {
        facts.push({ label: translate("wiki.article.standard.roleLimit.title"), value: String(roleData.maxCount) });
    }

    const sections: WikiSection[] = [
        {
            title: translate("wiki.article.role.abilities"),
            markdown: translateOptional(`wiki.article.role.${summary.slug}.abilities`)
                ?? translate("wiki.article.role.noAbilities"),
        },
        {
            title: translate("wiki.article.role.attributes"),
            markdown: translateOptional(`wiki.article.role.${summary.slug}.attributes`)
                ?? translate("wiki.article.role.noAttributes"),
        },
        {
            title: translate("wiki.article.role.extra"),
            markdown: translateOptional(`wiki.article.role.${summary.slug}.extra`)
                ?? translate("wiki.article.role.noExtra"),
        },
    ].map((section) => ({ ...section, markdown: replaceMentions(section.markdown) }));

    const examples: WikiExample[] = roleData.chatMessages.map((message, index) => ({
        label: formatExampleLabel(message, index),
        text: formatChatExample(message),
    }));
    const exampleAlibi = translateOptional(`wiki.article.role.${summary.slug}.exampleAlibi`);

    if (exampleAlibi) {
        const description = translateOptional(`wiki.article.role.${summary.slug}.exampleAlibi.description`);
        examples.push({
            label: translate("wiki.article.role.exampleAlibi"),
            text: replaceMentions(exampleAlibi),
            description: description ? replaceMentions(description) : undefined,
        });
    }

    return {
        ...summary,
        subtitle: roleData.roleSets.map((roleSet) => translate(roleSet)).join(" | "),
        markdown: markdownParts.join("\n\n"),
        facts,
        sections,
        examples,
        relatedArticles: [],
        groups: [],
        sourceText: null,
    };
}

function getCategoryArticle(summary: WikiArticleSummary): WikiArticle {
    const relatedArticles = ARTICLE_SUMMARIES
        .filter((article) => article.id !== summary.id && article.categories.includes(summary.slug as WikiCategory))
        .sort((left, right) => left.title.localeCompare(right.title));

    return {
        ...summary,
        subtitle: null,
        markdown: translateOptional(`wiki.category.${summary.slug}.text`) ?? "",
        facts: [],
        sections: [],
        examples: [],
        relatedArticles,
        groups: [],
        sourceText: null,
    };
}

function getGeneratedArticle(summary: WikiArticleSummary): WikiArticle {
    if (summary.slug === "all_text") {
        return {
            ...summary,
            subtitle: null,
            markdown: "",
            facts: [],
            sections: [],
            examples: [],
            relatedArticles: [],
            groups: [],
            sourceText: JSON.stringify(ENGLISH, null, 1),
        };
    }

    const groups = ROLE_SET_IDS
        .filter((roleSet) => roleSet !== "any")
        .map((roleSet) => ({
            title: translate(roleSet),
            description: translateOptional(`${roleSet}.description`),
            articles: ARTICLE_SUMMARIES.filter((article) => {
                return article.kind === "role" && ROLES[article.slug].roleSets.includes(roleSet);
            }),
        }));

    return {
        ...summary,
        subtitle: null,
        markdown: translate("wiki.article.generated.roleSet.extra", ROLE_IDS.length),
        facts: [],
        sections: [],
        examples: [],
        relatedArticles: [],
        groups,
        sourceText: null,
    };
}

/** Narrow an arbitrary route parameter to a supported article kind. */
export function isWikiKind(value: string): value is WikiKind {
    return WIKI_KINDS.includes(value as WikiKind);
}

/** Check that an article ID resolves to one of the generated static pages. */
export function isWikiArticleId(value: string): value is WikiArticleId {
    return ARTICLE_ID_SET.has(value);
}

/** Build one serializable English article from repository-owned content. */
export function getWikiArticle(id: WikiArticleId): WikiArticle | null {
    const summary = SUMMARY_BY_ID.get(id);

    if (!summary) {
        return null;
    }

    switch (summary.kind) {
        case "role":
            return getRoleArticle(summary);
        case "category":
            return getCategoryArticle(summary);
        case "generated":
            return getGeneratedArticle(summary);
        case "modifier":
            return {
                ...summary,
                subtitle: translate("modifiers"),
                markdown: replaceMentions(translate(`wiki.article.modifier.${summary.slug}.text`)),
                facts: [],
                sections: [],
                examples: [],
                relatedArticles: [],
                groups: [],
                sourceText: null,
            };
        case "standard":
            return {
                ...summary,
                subtitle: null,
                markdown: replaceMentions(translate(`wiki.article.standard.${summary.slug}.text`)),
                facts: [],
                sections: [],
                examples: [],
                relatedArticles: [],
                groups: [],
                sourceText: null,
            };
    }
}

/** Return lightweight search and navigation data for every wiki article. */
export function getWikiArticleSummaries(): WikiArticleSummary[] {
    return ARTICLE_SUMMARIES;
}

/** Group articles using the same categories as the legacy wiki index. */
export function getWikiIndexGroups(): WikiIndexGroup[] {
    const categories: WikiCategoryGroup[] = [...WIKI_CATEGORIES, "uncategorized"];
    return categories.map((category) => ({
        id: category,
        title: translate(`wiki.category.${category}`),
        articles: ARTICLE_SUMMARIES
            .filter((article) => article.categories.includes(category))
            .sort((left, right) => left.title.localeCompare(right.title)),
    }));
}

/** Return every SvelteKit parameter pair that must be prerendered. */
export function getWikiEntries(): WikiEntry[] {
    return ARTICLE_IDS.map((id) => {
        const [kind, slug] = splitArticleId(id);
        return { kind, slug };
    });
}

/** Resolve the previous and next articles in canonical catalog order. */
export function getAdjacentWikiArticles(id: WikiArticleId): {
    previous: WikiArticleSummary | null;
    next: WikiArticleSummary | null;
} {
    const index = ARTICLE_SUMMARIES.findIndex((article) => article.id === id);

    if (index < 0) {
        return { previous: null, next: null };
    }

    return {
        previous: ARTICLE_SUMMARIES[index - 1] ?? null,
        next: ARTICLE_SUMMARIES[index + 1] ?? null,
    };
}
