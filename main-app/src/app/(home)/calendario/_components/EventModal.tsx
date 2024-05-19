"use client";
import { CalendarioContext, IEventCalendar } from "@/contexts/CalendarioContext";
import { CheckIcon } from "lucide-react";
import { labelsClasses, labelsProviderToColor } from "@/lib/constantes";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CircleX, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { MisMarcasContext } from "@/contexts/MisMarcasContext";
import { toast } from "sonner";
import { FileBrowser } from "@/app/(home)/biblioteca/_components/file-browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileCard } from "@/app/(home)/biblioteca/_components/file-card";
import RedSocialCardChip from "./RedSocialCardChip";
import { ISocialMediaAccount } from "shared-lib/models/socialMediaAccount.model";
import { IPublication, IPublicationPost } from "shared-lib/models/publicaction.model";
import { deleteSchedulePublicationAction, postPublicationAction } from "@/lib/actions/publications.actions";
import { set } from "mongoose";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es"; // importa el locale español
import { daysToWeeks } from "date-fns";



export default function EventModal() {
  const {
    setIsOpenModalNewPost,
    isOpenModalNewPost,
    setDaySelected,
    daySelected,
    dispatchCalEvent,
    selectedEvent,
    selectedFileList, setSelectedFileList,
    selectedRedesSocialesList, setSelectedRedesSocialesList
  } = useContext(CalendarioContext);


  // ///Si hay seleccionado
  // if (selectedEvent) {
  //   const favFileFormat = selectedEvent?.files.map(f => ({
  //     ...f,
  //     isFavorited:true
  //   }));
  //   setSelectedFileList(favFileFormat);
  //   setSelectedRedesSocialesList(selectedEvent?.socialMedia.map(sm => sm.socialMedia));
  // }


  //TODO: BORRAR
  console.log("HORA DATE", new Date());
  console.log("HORA DAYSJ", dayjs().toDate());




  const {
    marcaGlobalSeleccionada
  } = useContext(MisMarcasContext);

  const { data: session } = useSession();

  const [isPostingNow, setIsPostingNow] = useState(false);
  const [time, setTime] = useState(new Date());
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [noErrors, setNoErrors] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState(
    selectedEvent ? selectedEvent.title : ""
  );
  const [selectedLabel, setSelectedLabel] = useState(
    selectedEvent
      ? labelsClasses.find((lbl) => lbl === selectedEvent.label)
      : labelsClasses[0]
  );

  async function handleSubmit(e: any) {
    e.preventDefault();
    setIsUploading(true);

    if (!noErrors) {
      toast.error("Revisa los campos de la publicación");
      setIsUploading(false);
      return;
    }

    //TODO: Manejar segun es programada o no
    const isPostingNow = daySelected?.isSame(new Date(), "day") || daySelected?.isBefore(new Date(), "day") || false;
    console.log("isPostingNow", isPostingNow);

    const publication: IPublicationPost = {
      title: title,
      creatorId: session?.user?.id as string,
      files: selectedFileList.map(f => f._id),
      marcaId: marcaGlobalSeleccionada?._id as string,
      alreadyPosted: false,
      isSchedule: isPostingNow ? false : true,
      isPostingInProgress: isPostingNow,
      programmedDate: daySelected?.toDate() as Date,
      programmedTime: time as Date,
      socialMedia: selectedRedesSocialesList.map(red => ({
        provider: red.provider,
        idPublicacionOnProvider: "",
        urlPost: "",
        socialMedia: red._id
      }))
    }

    console.log("publication", publication);



    const result = await postPublicationAction(publication);
    if (!result.isOk) {
      toast.error(result.message);
      setIsUploading(false);

      return;
    }
    toast.success(result.message);



    //////CODIGO UI

    const calendarEvent: IEventCalendar = {
      id: (result.data?._id as string) || "default_id",
      label: labelsProviderToColor[publication.socialMedia[0].provider] ?? "gray",
      ...result.data as IPublication,
    }

    if (selectedEvent) {
      dispatchCalEvent({ type: "update", payload: calendarEvent });
    } else {
      dispatchCalEvent({ type: "push", payload: calendarEvent });
    }
    
    setIsOpenModalNewPost(false);
    setSelectedFileList([]);
    setSelectedRedesSocialesList([]);
    setTitle("");
    setIsUploading(false);


  }

  const validacionesOk = () => {

    var newMessage = "";
    var noErrors = true;


    if (!isPostingNow) {
      //Validar fecha y hora
      if (!daySelected) {
        newMessage = "Selecciona una fecha";
        noErrors = false;
      }
      if (!time) {
        newMessage = "Selecciona una hora";
        noErrors = false;
      }

      if (daySelected && daySelected.isBefore(new Date(), "day")) {
        newMessage = "La fecha no puede ser anterior a hoy";
        noErrors = false;
      }

      if (daySelected && daySelected.isSame(new Date(), "day") && dayjs(time, "HH:mm").isBefore(dayjs(), "minute")) {
        newMessage = "La hora no puede ser anterior a la actual";
        noErrors = false;
      }

    }


    if (selectedRedesSocialesList.length === 0) {
      newMessage = "Selecciona al menos un red social";
      noErrors = false;
    }


    ///Si ha seleccionado twitter no puede pasarse de 280
    selectedRedesSocialesList.map((red: ISocialMediaAccount) => {
      if (red.provider === "twitter" && title.length > 280) {
        newMessage = newMessage + "\nTwitter: El mensaje no puede superar los 280 letras";
        noErrors = false;
      }

      if (red.provider === "youtube" && title.length > 100) { //TODO: Validar duracion de video <60 segundos si es short
        newMessage = newMessage + "\nYoutube shorts: El mensaje no puede superar los 100 letras";
        noErrors = false;
      }
    })

    if (selectedFileList.length > 1 && selectedRedesSocialesList.some(red => red.provider === "youtube")) {
      newMessage = newMessage + "\nYoutube: Solo se puede subir un video por publicación";
      noErrors = false;
    }

    if (selectedFileList.length > 4 && selectedRedesSocialesList.some(red => red.provider === "twitter")) {
      newMessage = newMessage + "\nTwitter: Solo acepta hasta 4 videos por publicación";
      noErrors = false;
    }

    if (selectedFileList.some(f => f.type === "image") && selectedRedesSocialesList.some(red => red.provider === "youtube")) {
      newMessage = newMessage + "\nYouTube: No se pueden subir imagenes a YouTube";
      noErrors = false;
    }



    if (selectedRedesSocialesList.some(red => red.provider === "youtube" && selectedFileList.length == 0)) {
      newMessage = newMessage + "\nYouTube: Tienes que seleccionar un video";
      noErrors = false;
    }

    setMessage(newMessage);
    setNoErrors(noErrors);



  }




  useEffect(() => {
    validacionesOk();
  }, [selectedRedesSocialesList, selectedFileList, title, time, daySelected]); //TODO: FECHA PROGRAMDOS


  const handlerCancelarPublicacion = async (idPublicacion: string) => {
    const result = await deleteSchedulePublicationAction(idPublicacion);
    if (!result.isOk) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
  }




  return (

    <AlertDialog onOpenChange={setIsOpenModalNewPost} open={isOpenModalNewPost}>
      <AlertDialogContent
        className="flex flex-col justify-between over-nav 
            h-[95vh] 
          sm:max-w-screen-md md:max-w-screen-lg lg:max-w-screen-xl 
           overflow-y-scroll "
      >
        {/* HEADER */}
        <AlertDialogHeader className="flex">
          <AlertDialogTitle className="text-2xl">Crear nueva publicación</AlertDialogTitle>
          <AlertDialogDescription>
            Deja llevar tu creatividad y comparte contenido de valor
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Button
          variant={"ghost"}
          className="absolute top-6 right-6 "
          onClick={() => setIsOpenModalNewPost(false)}
        >
          <CircleX size={32} />
        </Button>

        {/* CONTENT */}

        {/* //TODO: Unicamente se pueden eliminar los posts que son programador */}
        {selectedEvent && !selectedEvent.alreadyPosted && (
          <header className="bg-gray-100 px-4 py-2 flex justify-between items-center">
            <span className="material-icons-outlined text-gray-400">
            </span>
            <div>
              {selectedEvent && (
                <span
                  onClick={() => {
                    dispatchCalEvent({
                      type: "delete",
                      payload: selectedEvent,
                    });
                    handlerCancelarPublicacion(selectedEvent._id);
                    setIsOpenModalNewPost(false);
                  }}
                  className="material-icons-outlined text-gray-900 cursor-pointer"
                >
                  Cancelar programado
                </span>
              )}
            </div>
          </header>

        )}
        <div className="p-3">
          <div className="grid grid-cols-1/5 items-end gap-y-7">
            <div></div>
            <textarea
              name="title"
              placeholder="Descripción de la publicación"
              value={title}
              required
              rows={5}
              className="pt-3 border-0  text-base font-semibold pb-2 w-full border-b-2 border-gray-200 focus:outline-none focus:ring-0 focus:border-blue-500"
              onChange={(e) => setTitle(e.target.value)}
            />
            <span> Carácteres: {" "}
            </span>
            <span>
              {title.length + " "}

            </span>

            {message &&
              <>
                <span> Validaciones: {" "}
                </span>
                <span>
                  {message.split("\n").map((m, index) => (
                    <p key={index} className="text-blue-600">{m}</p>
                  ))}
                </span>
              </>
            }


            <span className="material-icons-outlined">
              Publicar ya
            </span>
            <p className="flex items-center">
              <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 p-8"
                value={isPostingNow.toString()}
                onChange={e => {
                  setIsPostingNow(e.target.checked);
                  if (e.target.checked) {
                    setDaySelected(dayjs());
                    setTime(new Date());
                  }
                }}
              />

              {isPostingNow && <label className="px-4">La publicación se realizará de inmediato</label>}

            </p>
            <span className="material-icons-outlined">
              Fecha
            </span>
            <p >
              {daySelected?.locale("es").format("dddd") + " - "}
              <input type="date" value={daySelected?.format("YYYY-MM-DD")}
                min={dayjs().format("YYYY-MM-DD")}
                disabled={isPostingNow}
                onChange={e => {
                  setDaySelected(dayjs(e.target.value));
                }} />

              <span className="px-8">Hora</span>
              <input type="time" value={time.getHours() + ":" + time.getMinutes()}
                disabled={isPostingNow}
                min={new Date().toISOString().substr(11, 5)}
                onChange={e => {

                  console.log("e.target.value", e.target.value);
                  var data = e.target.value.split(":");
                  const newHour = new Date();
                  newHour.setHours(Number(data[0]), Number(data[1]), 0, 0)
                  console.log("newHour", newHour);
                  setTime(newHour)
                }
                } />

            </p>
          </div>

          <br />
          <span className="material-icons-outlined">
            Redes sociales:
          </span>
          <br />
          <div className="flex gap-2 flex-wrap justify-evenly">
            {marcaGlobalSeleccionada?.socialMedia.map((social) => (

              <RedSocialCardChip key={social._id} social={social} />
            ))}
          </div>



          <div>
            <div className="w-full flex items-center justify-center p-4">

              <Button className="px-16 py-8 "
                onClick={() => setIsLibraryOpen(true)}
              >
                Abrir biblioteca
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedFileList.map((file, i) => (
                <FileCard key={file._id} file={file} />
              ))}

            </div>


          </div>
        </div>
        <Dialog onOpenChange={setIsLibraryOpen} open={isLibraryOpen}>

          <DialogContent className="over-over-nav  flex flex-col justify-between over-nav 
            h-[75vh] w-full
            bottom-[0%] top-[25%]  translate-y-0
            border-8 border-gray-900
            

          sm:max-w-screen-md md:max-w-screen-lg lg:max-w-screen-xl 
           overflow-y-scroll">
            <FileBrowser title="Selecciona los archivos de la publicación" />
          </DialogContent>
        </Dialog>


        {/* LOADING ICON DIALOG */}

        {isUploading && (


          <Dialog onOpenChange={setIsUploading} open={isUploading}>
            <DialogContent className="over-over-nav flex flex-col justify-center items-center">
              <DialogTitle>Publicando ...</DialogTitle>
              <Loader2 className="animate-spin" size={64} />
            </DialogContent>
          </Dialog>

        )}

        {/* FOOTER */}
        <AlertDialogFooter className="bottom-0 h-[80vh] flex justify-end border-t p-3 mt-5">

          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <Button onClick={handleSubmit} disabled={isUploading || selectedEvent?.alreadyPosted} >
            {isPostingNow ? "Publicar ya" : "Programar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
