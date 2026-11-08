// Regenerates assets/activity.svg from the GitHub GraphQL API. No dependencies.
// Text is pre-outlined in activity-glyphs.json because SVGs loaded through <img> cannot use web fonts.
import { readFileSync, writeFileSync } from "node:fs";

const { glyphs, staticPaths } = JSON.parse(readFileSync(new URL("./activity-glyphs.json", import.meta.url), "utf8"));
const BG = "#010101";
const LEVELS = { NONE: "#141518", FIRST_QUARTILE: "#2c4f80", SECOND_QUARTILE: "#3d6ca8", THIRD_QUARTILE: "#4f88d3", FOURTH_QUARTILE: "#60a3fd" };

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "User-Agent": "profile-readme-activity" },
  body: JSON.stringify({
    query: `{ user(login: "iangelmanuel") { contributionsCollection {
      totalCommitContributions totalPullRequestContributions
      contributionCalendar { totalContributions weeks { contributionDays { weekday contributionCount contributionLevel } } }
    } } }`,
  }),
});
const payload = await response.json();
if (!response.ok || payload.errors) throw new Error(`GitHub API error: ${JSON.stringify(payload.errors ?? response.status)}`);

const activity = payload.data.user.contributionsCollection;
const { weeks, totalContributions } = activity.contributionCalendar;
let streak = 0;
let bestStreak = 0;
for (const day of weeks.flatMap((week) => week.contributionDays)) {
  streak = day.contributionCount > 0 ? streak + 1 : 0;
  bestStreak = Math.max(bestStreak, streak);
}

const outline = (value, x, y) => {
  let cursor = x;
  let out = "";
  for (const ch of value) {
    const glyph = glyphs[ch];
    if (glyph.d) out += `<path fill="#ffffff" transform="translate(${cursor.toFixed(2)} ${y})" d="${glyph.d}"/>`;
    cursor += glyph.a;
  }
  return out;
};

const values = [totalContributions, activity.totalCommitContributions, activity.totalPullRequestContributions, `${bestStreak} days`];
const numbers = values.map((value, i) => outline(String(value), 40 + i * 280, 200)).join("\n");
const cells = weeks
  .flatMap((week, column) =>
    week.contributionDays.map(
      (day) => `<rect x="${40 + column * 21}" y="${288 + day.weekday * 21}" width="18" height="18" rx="4" fill="${LEVELS[day.contributionLevel]}"/>`,
    ),
  )
  .join("\n");

writeFileSync(
  new URL("../../assets/activity.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="472" viewBox="0 0 1200 472">
<rect width="1200" height="472" fill="${BG}"/>
${staticPaths}
${numbers}
${cells}
</svg>
`,
);
