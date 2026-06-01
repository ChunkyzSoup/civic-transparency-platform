import seed from "../../data/demo/mvp-seed.json";

async function main() {
  console.log("Demo dataset loaded.");
  console.log(`Version: ${seed.metadata.version}`);
  console.log(`Mode: ${seed.metadata.mode}`);
  console.log(seed.metadata.disclaimer);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

