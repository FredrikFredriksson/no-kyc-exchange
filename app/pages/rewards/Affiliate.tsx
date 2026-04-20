import { Helmet } from "react-helmet-async";
import { Dashboard, ReferralProvider } from "@orderly.network/affiliate";
import { generatePageTitle } from "@/utils/utils";

export default function RewardsAffiliate() {
  return (
    <>
      <Helmet>
        <title>{generatePageTitle("Affiliate")}</title>
      </Helmet>
      <h1 className="sr-only">Affiliate Rewards</h1>
      <ReferralProvider
        becomeAnAffiliateUrl="https://orderly.network"
        learnAffiliateUrl="https://orderly.network"
        referralLinkUrl={
          typeof window !== "undefined"
            ? window.location.origin
            : "https://orderly.network"
        }
      >
        <Dashboard.DashboardPage />
      </ReferralProvider>
      <div className="oui-px-3 oui-py-6 lg:oui-px-6 oui-text-center oui-text-base-contrast-54 oui-text-sm">
        Have questions? Contact us at{" "}
        <a
          href="mailto:contact@ainewscrypto.com"
          className="oui-text-primary-light hover:oui-underline"
        >
          contact@ainewscrypto.com
        </a>
        .
      </div>
    </>
  );
}
