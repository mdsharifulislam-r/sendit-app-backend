import { Project } from "ts-morph";
import { globSync } from "glob";
import { generateDocs } from "./parser";
import { writeIfChanged } from "./writer";

const args = process.argv.slice(2);

const modules = args.length ? args : ["**"];

function getFiles() {
  const patterns = modules.map(
    (m) => `src/${m}/**/*.{dto,controller}.ts`
  );

  let files: string[] = [];

  for (const pattern of patterns) {
    files.push(...globSync(pattern));
  }

  return [...new Set(files)];
}

function shouldSkip(content: string) {
  return (
    content.includes("@ApiProperty(") ||
    content.includes("@ApiOperation(") ||
    content.includes("@ApiTags(")
  );
}

async function run() {
  const project = new Project({
    tsConfigFilePath: "tsconfig.json",
  });

  const files = getFiles();

  console.log("Found:", files.length);

  for (const file of files) {
    try {
      const source = project.addSourceFileAtPath(file);
      const original = source.getFullText();

      if (shouldSkip(original)) {
        console.log("skip:", file);
        continue;
      }

      console.log("generating:", file);

      const updated = await generateDocs(original);

      const result = writeIfChanged(file, original, updated!);

      if (result.updated) {
        console.log("updated:", file);
      } else {
        console.log("skip:", file);
      }
    } catch (err) {
      console.error("error:", file);
      console.error(err);
    }
  }

  console.log("done");
}

run();