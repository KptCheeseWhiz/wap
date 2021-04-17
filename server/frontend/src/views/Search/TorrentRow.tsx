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
import { torrent_files } from "helpers/api";
import { toURL } from "helpers/fetch";

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
  const [files, setFiles] = useState<
    { name: string; path: string; length: number; progress: number }[] | null
  >(null);

  useEffect(() => {
    setOpen(false);
    setFiles(null);
  }, [torrent.magnet]);

  const onOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setOpen(!open);
    if (!files) {
      torrent_files({ magnet: torrent.magnet, sig: torrent.sig })
        .then(setFiles)
        .catch((e) => {
          if (e.message) enqueueSnackbar(e.message, { variant: "error" });
          setOpen(false);
        });
    }
    event.stopPropagation();
  };

  const onStreamClick = (video: {
    magnet: string;
    name: string;
    path: string;
    sig: string;
  }) => (event: React.MouseEvent<HTMLButtonElement>) => {
    dispatch({ type: "SET_VIDEO", value: { ...video, open: true } });
    event.preventDefault();
  };

  const onEnded = ({
    name,
    path,
    length,
  }: {
    name: string;
    path: string;
    length: number;
    progress: number;
  }) => () => {
    if (!files) return;
    const nfiles = [...files];
    const file = nfiles.find(
      (file) =>
        file.name === name && file.path === path && file.length === length,
    );
    if (file) file.progress = 1;
    enqueueSnackbar(`${name} has finished preloading!`, { variant: "success" });
    setFiles(nfiles);
  };

  const onClick = (url: string) => (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
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
                    {files.map((file, i) => {
                      const filedl = toURL(
                        window.location.origin +
                          "/api/torrent/download/" +
                          encodeURIComponent(file.name),
                        {
                          magnet: torrent.magnet,
                          path: file.path,
                          sig: torrent.sig,
                        },
                      );
                      const filepl = toURL(
                        window.location.origin + "/api/torrent/preload",
                        {
                          magnet: torrent.magnet,
                          name: file.name,
                          path: file.path,
                          sig: torrent.sig,
                        },
                      );
                      const filestream = toURL(
                        window.location.origin + "/player",
                        {
                          magnet: torrent.magnet,
                          name: file.name,
                          path: file.path,
                          sig: torrent.sig,
                        },
                      );

                      return (
                        <TableRow key={"file" + i}>
                          <TableCell>
                            {(file.path ? file.path + "/" : "") + file.name}
                          </TableCell>
                          <TableCell>
                            {(file.length / 1048576).toFixed() + " MiB"}
                          </TableCell>
                          <TableCell>
                            <DownloadingButton name={file.name} href={filedl} />
                            <Button
                              aria-label="Stream"
                              color="secondary"
                              href={filestream}
                              onClick={onStreamClick({
                                magnet: torrent.magnet,
                                name: file.name,
                                path: file.path,
                                sig: torrent.sig,
                              })}
                            >
                              {"Stream"}
                            </Button>
                            {file.progress !== 1 && (
                              <PreloadingButton
                                href={filepl}
                                onEnded={onEnded(file)}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={10}>
                        <Button
                          aria-label="Torrent"
                          color="secondary"
                          href={torrent.download}
                          onClick={onClick(torrent.download)}
                        >
                          Torrent
                        </Button>
                        <Button
                          aria-label="Magnet"
                          color="secondary"
                          href={torrent.magnet}
                          onClick={onClick(torrent.magnet)}
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
