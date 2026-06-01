import seed from "../../data/demo/mvp-seed.json";

async function main() {
  console.log("Signal build scaffold");
  console.log(`Methodology version: ${seed.metadata.methodologyVersion}`);
  console.log("Next step: replace demo-derived output with database-backed signal generation.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

