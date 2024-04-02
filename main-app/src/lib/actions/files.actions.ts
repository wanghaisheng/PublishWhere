"use server";

import { IFile, IFilePost } from "../models/file.model";
import { File, Marca } from "../models/models";
import { IServerResponse } from "./ServerResponse";



export async function fetch(fileId: string): Promise<IServerResponse<IFile>> {
    try {

        var result = await File.findById(fileId);
        if (!result) {
            return { result: null, isOk: false, error: "No existe el archivo" };
        }

        return {
            result: JSON.parse(JSON.stringify(result)) as IFile,
            isOk: true,
            error: null
        };

    } catch (error: any) {
        return { result: null, isOk: false, error: "No existe el archivo" };
    }
}
export async function fetchAllFilesByMarca(marcaId: string, trashOnly: boolean = false): Promise<IServerResponse<IFile[]>> {
    try {

        const filesQuery = await File.find<IFile>({
            marcaId: marcaId,
            shouldDelete: trashOnly
        }).populate('creatorId');
        const files = JSON.parse(JSON.stringify(filesQuery)) as IFile[];
        return { result: files, isOk: true, error: null };

    } catch (error: any) {
        return { result: [], isOk: false, error: "No hay archivos" };
    }
}

export async function fetchMyFiles(userId: string): Promise<IServerResponse<IFile[]>> {
    try {
        // connectToDB();

        const filesQuery = await File.find({ creatorId: userId });
        const result = JSON.parse(JSON.stringify(filesQuery)) as IFile[];

        return { result: result, isOk: true, error: null };

    } catch (error: any) {
        return { result: [], isOk: false, error: "No hay archivos" };
    }
}

//Works for both creating File and updating Marca reference
export async function postCrearFile(newFile: IFilePost): Promise<IServerResponse<IFile>> {

    try {

        const marca = await Marca.findById(newFile.marcaId);
        if (!marca) {
            return { result: null, isOk: false, error: "No existe la marca" };
        }

        const newFileMongo = await File.create(newFile);
        //Validar que si se ha creado el archivo
        if (!newFileMongo) {
            return { result: null, isOk: false, error: "No se ha podido crear el archivo" };
        }
        marca.files.push(newFileMongo);
        await marca.save();


        return {
            result: JSON.parse(JSON.stringify(newFileMongo)) as IFile,
            isOk: true,
            error: null
        };


    } catch (error: any) {
        return { result: null, isOk: false, error: "Ya existe ese archivo" };
    }
}


export async function sendToTrashFile(fileId: string): Promise<IServerResponse<IFile>> {
    try {


        const result = await File.findByIdAndUpdate(fileId, { shouldDelete: true }, { new: true });

        return {
            result: JSON.parse(JSON.stringify(result)) as IFile,
            isOk: true,
            error: "Enviado a la papelera con éxito"
        };
    } catch (error: any) {
        return { result: null, isOk: false, error: "No es posible eliminar el archivo" };
    }
}

export async function restoreTrashFile(fileId: string): Promise<IServerResponse<IFile>> {
    try {


        const result = await File.findByIdAndUpdate(fileId, { shouldDelete: false }, { new: true });

        return {
            result: JSON.parse(JSON.stringify(result)) as IFile,
            isOk: true,
            error: "Enviado a la papelera con éxito"
        };
    } catch (error: any) {
        return { result: null, isOk: false, error: "No es posible eliminar el archivo" };
    }
}


export async function markFileAsUsed(fileId: string): Promise<IServerResponse<IFile>> {
    try {

        const result = await File.findByIdAndUpdate(fileId, { alreadyUsed: true }, { new: true });

        return {
            result: JSON.parse(JSON.stringify(result)) as IFile,
            isOk: true,
            error: "Archivo marcado como usado"
        };
    } catch (error: any) {
        return { result: null, isOk: false, error: "No es posible usar el archivo" };
    }
}



export async function deleteFile(fileId: string): Promise<IServerResponse<boolean>> {
    try {



        const result = await File.deleteOne({ _id: fileId });
        console.log("Delete count: ", result.deletedCount)

        if (result.deletedCount == 0) {
            return { result: false, isOk: false, error: "No es posible eliminar el archivo" };
        }
        return {
            result: true,
            isOk: true,
            error: "Eliminado con exito"
        };

    } catch (error: any) {
        return { result: false, isOk: false, error: "No es posible eliminar el miembro al equipo" };
    }
}

