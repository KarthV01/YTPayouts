import { Navigate, Route, Routes } from "react-router-dom";
import { EntryPage } from "./pages/Entry";
import { CreatorLayout } from "./pages/CreatorLayout";
import { SponsorLayout } from "./pages/SponsorLayout";
import { CreatorDealDetailPage } from "./pages/creator/DealDetail";
import { CreatorDealsPage } from "./pages/creator/Deals";
import { CreatorEarningsPage } from "./pages/creator/Earnings";
import { CreatorHomePage } from "./pages/creator/Home";
import { SponsorContractDetailPage } from "./pages/sponsor/ContractDetail";
import { SponsorContractsPage } from "./pages/sponsor/Contracts";
import { CreatorsPage } from "./pages/sponsor/Creators";
import { SponsorHomePage } from "./pages/sponsor/Home";
import { NewContractPage } from "./pages/sponsor/NewContract";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<EntryPage />} />
      <Route path="/sponsor" element={<SponsorLayout />}>
        <Route index element={<SponsorHomePage />} />
        <Route path="contracts" element={<SponsorContractsPage />} />
        <Route path="contracts/new" element={<NewContractPage />} />
        <Route path="contracts/:id" element={<SponsorContractDetailPage />} />
        <Route path="creators" element={<CreatorsPage />} />
      </Route>
      <Route path="/creator/:creatorId" element={<CreatorLayout />}>
        <Route index element={<CreatorHomePage />} />
        <Route path="deals" element={<CreatorDealsPage />} />
        <Route path="deals/:id" element={<CreatorDealDetailPage />} />
        <Route path="earnings" element={<CreatorEarningsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
