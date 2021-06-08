import React, { useState, useEffect, useContext } from "react";

import { useSnackbar } from "notistack";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@material-ui/icons";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Collapse,
  IconButton,
  Button,
} from "@material-ui/core";

import DownloadingButton from "components/DownloadingButton";
import PreloadingButton from "components/PreloadingButton";

import { context } from "helpers/reducer";
import { torrent_files, player_ffprobe } from "helpers/api";
import { toURL } from "helpers/http";

function TorrentRow({
  torrent,
  columns,
}: {
  torrent: {
    title: string;
    download: string;
    magnet: string;
    sig: string;

    category: string;
    size: string;
    date: Date | string | number;
    seeders: number;
    leechers: number;
    downloads: number;
  };
  columns: { name: string; value: string; sortable: boolean }[];
}) {
  const { dispatch } = useContext(context);
  const { enqueueSnackbar } = useSnackbar();

  const [open, setOpen] = useState<boolean>(false);
  const [files, setFiles] =
    useState<
      | {
          name: string;
          path: string;
          length: number;
          mime: string;
          progress: number;
        }[]
      | null
    >(null);

  useEffect(() => {
    setOpen(false);
    setFiles(null);
  }, [torrent.magnet]);

  const onOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    if (open && !files) return;
    setOpen(!open);
    if (!files) {
      torrent_files({ magnet: torrent.magnet, sig: torrent.sig })
        .then(async (files) => {
          for (let file of files)
            if (file.progress === 1 && (await getVideoCodec(file)) !== "h264")
              file.progress = 2;
          return files;
        })
        .then(setFiles)
        .catch((e) => {
          if (e.message) enqueueSnackbar(e.message, { variant: "error" });
          setOpen(false);
        });
    }
  };

  const onWatchClick =
    (video: { magnet: string; name: string; path: string; sig: string }) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      dispatch({ type: "SET_VIDEO", value: { ...video, open: true } });
      event.preventDefault();
    };

  const getVideoCodec = async ({
    name,
    path,
  }: {
    name: string;
    path: string;
  }): Promise<string> =>
    (
      await player_ffprobe({
        name,
        path,
        magnet: torrent.magnet,
        sig: torrent.sig,
      })
    ).find((stream) => stream.codec_type === "video")?.codec_name || "???";

  const onEnded =
    ({
      name,
      path,
    }: {
      name: string;
      path: string;
      length: number;
      progress: number;
    }) =>
    async (canceled: boolean) => {
      if (!files || canceled) return;
      const nfiles = [...files];
      const file = nfiles.find(
        (file) => file.name === name && file.path === path,
      );
      if (file) {
        enqueueSnackbar(`${name} has finished preloading!`, {
          variant: "success",
        });

        if (file.mime.indexOf("video/") === 0) {
          const codec = await getVideoCodec(file);
          if (codec !== "h264") {
            file.progress = 2;
            enqueueSnackbar(
              `The file's video codec "${codec}" is not supported. You can right-click the download button, copy the link and open it in VLC instead.`,
              {
                variant: "info",
              },
            );
          } else file.progress = 1;
        } else file.progress = 1;

        setFiles(nfiles);
      }
    };

  const onOpen =
    (url: string) => (event: React.MouseEvent<HTMLButtonElement>) => {
      window.open(url, "_blank", "noopener noreferrer");
      event.preventDefault();
    };

  return (
    <>
      <TableRow onClick={onOpenMenu}>
        {columns.map(({ value }, i) => (
          <TableCell key={i}>{(torrent as any)[value]}</TableCell>
        ))}
        <TableCell>
          <IconButton onClick={onOpenMenu}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow key={"menu"}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!files && (
                  <TableRow>
                    <TableCell>
                      <CircularProgress
                        variant="indeterminate"
                        color="secondary"
                      />
                    </TableCell>
                  </TableRow>
                )}
                {files && (
                  <>
                    {files.map((file, i) => (
                      <TableRow key={"file" + i}>
                        <TableCell>
                          {(file.path ? file.path + "/" : "") + file.name}
                        </TableCell>
                        <TableCell>
                          {(file.length / 1048576).toFixed() + " MiB"}
                        </TableCell>
                        <TableCell>
                          <DownloadingButton
                            name={file.name}
                            href={toURL(
                              window.location.origin +
                                "/api/torrent/download/" +
                                encodeURIComponent(file.name),
                              {
                                magnet: torrent.magnet,
                                path: file.path,
                                sig: torrent.sig,
                              },
                            )}
                          />
                          {file.mime.indexOf("video/") === 0 && (
                            <>
                              {(file.progress < 1 && (
                                <PreloadingButton
                                  href={toURL(
                                    window.location.origin +
                                      "/api/torrent/preload",
                                    {
                                      magnet: torrent.magnet,
                                      name: file.name,
                                      path: file.path,
                                      sig: torrent.sig,
                                    },
                                  )}
                                  onEnded={onEnded(file) as any}
                                />
                              )) ||
                                (file.progress <= 1 && (
                                  <Button
                                    aria-label="Watch"
                                    color="secondary"
                                    href={toURL(
                                      window.location.origin + "/player",
                                      {
                                        magnet: torrent.magnet,
                                        name: file.name,
                                        path: file.path,
                                        sig: torrent.sig,
                                      },
                                    )}
                                    onClick={onWatchClick({
                                      magnet: torrent.magnet,
                                      name: file.name,
                                      path: file.path,
                                      sig: torrent.sig,
                                    })}
                                  >
                                    {"Watch"}
                                  </Button>
                                ))}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={10}>
                        <Button
                          aria-label="Torrent"
                          color="secondary"
                          href={torrent.download}
                          onClick={onOpen(torrent.download)}
                        >
                          Torrent
                        </Button>
                        <Button
                          aria-label="Magnet"
                          color="secondary"
                          href={torrent.magnet}
                          onClick={onOpen(torrent.magnet)}
                        >
                          Magnet
                        </Button>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default TorrentRow;
