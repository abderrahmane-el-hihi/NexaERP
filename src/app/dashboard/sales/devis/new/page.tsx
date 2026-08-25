import NewDevisForm from "@/modules/sales/components/NewDevisForm";
import { getCompanies } from "@/modules/crm/services/company.service";
import { getOpportunities } from "@/modules/crm/services/opportunity.service";
import { getProducts } from "@/modules/catalog/services/product.service";

export default async function NewDevisPage() {
  const [companies, opportunities, products] = await Promise.all([
    getCompanies(),
    getOpportunities(),
    getProducts(),
  ]);

  return (
    <NewDevisForm
      companies={companies}
      opportunities={opportunities}
      products={products}
    />
  );
}
