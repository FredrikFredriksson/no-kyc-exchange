import { Helmet } from "react-helmet-async";
import { Dashboard, ReferralProvider } from "@orderly.network/affiliate";
import { generatePageTitle } from "@/utils/utils";

export default function RewardsAffiliate() {
  return (
    <>
      <Helmet>
        <title>{generatePageTitle("Affiliate")}</title>
      </Helmet>
      <ReferralProvider
        becomeAnAffiliateUrl="https://orderly.network"
        learnAffiliateUrl="https://orderly.network"
        referralLinkUrl={
          typeof window !== "undefined"
            ? window.location.origin
            : "https://orderly.network"
        }
      >
        <Dashboard.AffiliatePage />
      </ReferralProvider>
    </>
  );
}
