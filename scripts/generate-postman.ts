import fs from "fs";
import path from "path";
import converter from "openapi-to-postmanv2";

const swaggerPath = path.join(process.cwd(), "docs/swagger.json");

if (!fs.existsSync(swaggerPath)) {
  console.error("swagger.json not found. run generate-swagger first");
  process.exit(1);
}

const swagger = JSON.parse(
  fs.readFileSync(swaggerPath, "utf8")
);

converter.convert(
  { type: "json", data: swagger },
  { folderStrategy: "Tags" },
  (err, result) => {
    if (err) {
      console.error(err);
      return;
    }

    const outputDir = path.join(process.cwd(), "docs");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    fs.writeFileSync(
      path.join(outputDir, "postman_collection.json"),
      JSON.stringify(result?.output?.[0].data, null, 2)
    );

    console.log("Postman collection generated");
  }
);