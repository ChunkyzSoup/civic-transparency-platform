export const datasets = [
  {
    id: "fec-candidate-master",
    name: "FEC candidate master file",
    stage: "required",
    officialUrl:
      "https://www.fec.gov/campaign-finance-data/candidate-master-file-description/"
  },
  {
    id: "fec-committee-master",
    name: "FEC committee master file",
    stage: "required",
    officialUrl:
      "https://www.fec.gov/campaign-finance-data/committee-master-file-description/"
  },
  {
    id: "fec-committee-to-candidate",
    name: "FEC committee-to-candidate contributions",
    stage: "required",
    officialUrl:
      "https://www.fec.gov/campaign-finance-data/contributions-committees-candidates-file-description/"
  },
  {
    id: "house-member-xml",
    name: "House member XML",
    stage: "required",
    officialUrl: "https://clerk.house.gov/member_info/MemberData_UserGuide.pdf"
  },
  {
    id: "senate-xml-index",
    name: "Senate XML feeds",
    stage: "required",
    officialUrl: "https://www.senate.gov/general/common/generic/XML_Availability.htm"
  },
  {
    id: "congress-bills",
    name: "Congress.gov or GovInfo bills",
    stage: "required",
    officialUrl: "https://github.com/LibraryOfCongress/api.congress.gov"
  }
] as const;

