import { parseSenateXml } from "../parsers/senate";
import { getCurrentCongress } from "../parsers/helpers";
import { fetchText } from "../utils/io";

const SENATE_MEMBER_XML_URL = "https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml";
const SENATE_CONTACT_XML_URL =
  "https://www.senate.gov/general/contact_information/senators_cfm.xml";

export async function syncSenateMembers(checkedAt = new Date().toISOString()) {
  const [rosterXml, contactXml] = await Promise.all([
    fetchText(SENATE_MEMBER_XML_URL),
    fetchText(SENATE_CONTACT_XML_URL)
  ]);

  return parseSenateXml(
    rosterXml,
    contactXml,
    checkedAt,
    getCurrentCongress(new Date(checkedAt))
  );
}
