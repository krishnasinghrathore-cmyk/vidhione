import { gql, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { useLedgerLookup } from '../../billing/useLedgerLookup';

type LookupOption = {
    label: string;
    value: string;
};

type ProductRow = {
    productId: number;
    name: string | null;
    code: string | null;
    units?: { unitId: number }[] | null;
};

type UnitRow = {
    unitId: number;
    name: string | null;
};

type TransporterRow = {
    transporterId: number;
    name: string | null;
    alias: string | null;
};

type GodownRow = {
    godownId: number;
    name: string | null;
};

const TEXTILE_PRODUCTS_QUERY = gql`
    query TextileProducts($search: String, $limit: Int) {
        products(search: $search, limit: $limit, isActiveFlag: 1) {
            productId
            name
            code
            units {
                unitId
            }
        }
    }
`;

const TEXTILE_UNITS_QUERY = gql`
    query TextileUnits($limit: Int) {
        units(limit: $limit) {
            unitId
            name
        }
    }
`;

const TEXTILE_TRANSPORTERS_QUERY = gql`
    query TextileTransporters($search: String, $limit: Int) {
        transporters(search: $search, limit: $limit) {
            transporterId
            name
            alias
        }
    }
`;

const TEXTILE_GODOWNS_QUERY = gql`
    query TextileGodowns($limit: Int) {
        godowns(limit: $limit) {
            godownId
            name
        }
    }
`;

const toOption = (id: number, label: string): LookupOption => ({
    value: String(id),
    label
});

export const useTextileLookups = () => {
    const { ledgers, loading: ledgerLoading, error: ledgerError } = useLedgerLookup();
    const { data: productsData, loading: productsLoading, error: productsError } = useQuery<{ products: ProductRow[] }>(
        TEXTILE_PRODUCTS_QUERY,
        { variables: { search: null, limit: 1000 } }
    );
    const { data: unitsData, loading: unitsLoading, error: unitsError } = useQuery<{ units: UnitRow[] }>(
        TEXTILE_UNITS_QUERY,
        { variables: { limit: 500 } }
    );
    const { data: transportersData, loading: transportersLoading, error: transportersError } = useQuery<{
        transporters: TransporterRow[];
    }>(TEXTILE_TRANSPORTERS_QUERY, {
        variables: { search: null, limit: 500 }
    });
    const { data: godownsData, loading: godownsLoading, error: godownsError } = useQuery<{ godowns: GodownRow[] }>(
        TEXTILE_GODOWNS_QUERY,
        { variables: { limit: 500 } }
    );

    const ledgerOptions = useMemo(
        () =>
            ledgers.map((ledger) => {
                const ledgerId = Number(ledger.ledgerId);
                const name = ledger.name?.trim() || `Ledger ${ledgerId}`;
                const gstText = ledger.gstNumber?.trim() ? ` | GSTIN ${ledger.gstNumber.trim()}` : '';
                return toOption(ledgerId, `${name}${gstText}`);
            }),
        [ledgers]
    );

    const ledgerNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const ledger of ledgers) {
            const ledgerId = Number(ledger.ledgerId);
            if (!Number.isFinite(ledgerId)) continue;
            map.set(String(ledgerId), ledger.name?.trim() || `Ledger ${ledgerId}`);
        }
        return map;
    }, [ledgers]);

    const productRows = productsData?.products ?? [];
    const productOptions = useMemo(
        () =>
            productRows.map((product) => {
                const productId = Number(product.productId);
                const name = product.name?.trim() || `Product ${productId}`;
                const code = product.code?.trim() ? ` (${product.code.trim()})` : '';
                return toOption(productId, `${name}${code}`);
            }),
        [productRows]
    );

    const productNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const product of productRows) {
            const productId = Number(product.productId);
            if (!Number.isFinite(productId)) continue;
            map.set(String(productId), product.name?.trim() || `Product ${productId}`);
        }
        return map;
    }, [productRows]);

    const productDefaultUnitById = useMemo(() => {
        const map = new Map<string, string>();
        for (const product of productRows) {
            const productId = Number(product.productId);
            const defaultUnitId = product.units?.[0]?.unitId;
            if (!Number.isFinite(productId) || !Number.isFinite(defaultUnitId)) continue;
            map.set(String(productId), String(defaultUnitId));
        }
        return map;
    }, [productRows]);

    const unitRows = unitsData?.units ?? [];
    const unitOptions = useMemo(
        () =>
            unitRows.map((unit) => {
                const unitId = Number(unit.unitId);
                return toOption(unitId, unit.name?.trim() || `Unit ${unitId}`);
            }),
        [unitRows]
    );

    const unitNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const unit of unitRows) {
            const unitId = Number(unit.unitId);
            if (!Number.isFinite(unitId)) continue;
            map.set(String(unitId), unit.name?.trim() || `Unit ${unitId}`);
        }
        return map;
    }, [unitRows]);

    const transporterRows = transportersData?.transporters ?? [];
    const transporterOptions = useMemo(
        () =>
            transporterRows.map((transporter) => {
                const transporterId = Number(transporter.transporterId);
                const name = transporter.name?.trim() || `Transporter ${transporterId}`;
                const alias = transporter.alias?.trim() ? ` | ${transporter.alias.trim()}` : '';
                return toOption(transporterId, `${name}${alias}`);
            }),
        [transporterRows]
    );

    const transporterNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const transporter of transporterRows) {
            const transporterId = Number(transporter.transporterId);
            if (!Number.isFinite(transporterId)) continue;
            map.set(String(transporterId), transporter.name?.trim() || `Transporter ${transporterId}`);
        }
        return map;
    }, [transporterRows]);

    const godownRows = godownsData?.godowns ?? [];
    const godownOptions = useMemo(
        () =>
            godownRows.map((godown) => {
                const godownId = Number(godown.godownId);
                return toOption(godownId, godown.name?.trim() || `Godown ${godownId}`);
            }),
        [godownRows]
    );

    const godownNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const godown of godownRows) {
            const godownId = Number(godown.godownId);
            if (!Number.isFinite(godownId)) continue;
            map.set(String(godownId), godown.name?.trim() || `Godown ${godownId}`);
        }
        return map;
    }, [godownRows]);

    const errorMessages = [
        ledgerError?.message,
        productsError?.message,
        unitsError?.message,
        transportersError?.message,
        godownsError?.message
    ].filter((value): value is string => Boolean(value));

    return {
        ledgerOptions,
        ledgerNameById,
        productOptions,
        productNameById,
        productDefaultUnitById,
        unitOptions,
        unitNameById,
        transporterOptions,
        transporterNameById,
        godownOptions,
        godownNameById,
        loading: ledgerLoading || productsLoading || unitsLoading || transportersLoading || godownsLoading,
        errorMessages
    };
};

export type TextileLookups = ReturnType<typeof useTextileLookups>;
