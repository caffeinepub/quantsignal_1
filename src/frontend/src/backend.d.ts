import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Ativo {
    volume: number;
    variacao: number;
    score: number;
    preco: number;
    symbol: string;
}
export interface Padrao {
    volatilidade: number;
    volume: number;
    compressao: number;
    distMediaMovel: number;
    aceleracao: number;
    symbol: string;
}
export interface backendInterface {
    calcularScore(p: Padrao): Promise<number>;
    getAtivos(): Promise<Array<Ativo>>;
    getPadroes(): Promise<Array<Padrao>>;
    limparDados(): Promise<void>;
    salvarAtivos(dados: Array<Ativo>): Promise<void>;
    salvarPadrao(p: Padrao): Promise<void>;
}
