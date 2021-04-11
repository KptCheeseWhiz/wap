import React, { useState, useEffect } from "react";

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

import LoadingButton from "components/DownloadingButton";

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
  const { enqueueSnackbar } = useSnackbar();

  const [open, setOpen] = useState<boolean>(false);
  const [files, setFiles] = useState<
    { name: string; path: string; size: number }[] | null
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
          enqueueSnackbar(e.message, { variant: "error" });
          setOpen(false);
        });
    }
    event.stopPropagation();
  };

  const onClick = (url: string) => (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    window.open(url, "_blank", "noopener noreferrer");
  };

  const pldl = toURL(window.location.origin + "/api/torrent/playlist", {
    name: "",
    path: "",
    magnet: torrent.magnet,
    sig: torrent.sig,
  });
  const plstream = "vlc://" + pldl;

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
                      const filestream = "vlc://" + filedl;

                      return (
                        <TableRow key={"file" + i}>
                          <TableCell>
                            {(file.path ? file.path + "/" : "") + file.name}
                          </TableCell>
                          <TableCell>
                            {(file.size / 1048576).toFixed() + " MiB"}
                          </TableCell>
                          <TableCell>
                            <LoadingButton url={filedl} name={file.name} />
                            <Button
                              aria-label="Stream"
                              color="secondary"
                              href={filestream}
                              onClick={onClick(filestream)}
                            >
                              {"Stream"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={10}>
                        <Button
                          aria-label="Download"
                          color="secondary"
                          href={torrent.download}
                          onClick={onClick(torrent.download)}
                        >
                          Download
                        </Button>
                        <Button
                          aria-label="Magnet"
                          color="secondary"
                          href={torrent.magnet}
                          onClick={onClick(torrent.magnet)}
                        >
                          Magnet
                        </Button>
                        <Button
                          aria-label="Download playlist"
                          color="secondary"
                          href={pldl}
                          onClick={onClick(pldl)}
                        >
                          Download playlist
                        </Button>
                        <Button
                          aria-label="Stream playlist"
                          color="secondary"
                          href={plstream}
                          onClick={onClick(plstream)}
                        >
                          Stream playlist
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
