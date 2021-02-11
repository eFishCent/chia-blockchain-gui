import React, { useState } from 'react';
import { Trans } from '@lingui/macro';
import { get } from 'lodash';
import {
  FormatBytes,
  Flex,
  Card,
  Loading,
  StateColor,
  Table,
} from '@chia/core';
import { Status } from '@chia/icons';
import { useRouteMatch, useHistory } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Button,
  Grid,
  TextField,
  Tooltip,
  Typography,
} from '@material-ui/core';
import HelpIcon from '@material-ui/icons/Help';
import { unix_to_short_date } from '../../util/utils';
import FullNodeConnections from './FullNodeConnections';
import {
  closeConnection,
  openConnection,
} from '../../modules/fullnodeMessages';
import LayoutMain from '../layout/LayoutMain';

/* global BigInt */

const cols = [
  {
    minWidth: '250px',
    field(row) {
      const {
        isFinished = false,
        header_hash,
        foliage_sub_block,
      } = row;

      const { foliage_block_hash } = foliage_sub_block || {};

      const value = isFinished ? (
        header_hash
      ) : (
        <span>{foliage_block_hash}</span>
      );

      const color = isFinished ? StateColor.SUCCESS : StateColor.WARNING;

      const tooltip = isFinished ? (
        <Trans>Finished</Trans>
      ) : (
        <Trans>In Progress</Trans>
      );

      return (
        <Flex gap={1} alignItems="center">
          <Tooltip title={<span>{tooltip}</span>}>
            <Status color={color} />
          </Tooltip>
          <Tooltip title={<span>{value}</span>}>
            <Box textOverflow="ellipsis" overflow="hidden">
              {value}
            </Box>
          </Tooltip>
        </Flex>
      );
    },
    title: <Trans>Header Hash</Trans>,
  },
  {
    field(row) {
      const {
        timestamp,
        isFinished,
        foliage_block,
        foliage_sub_block,
      } = row;

      const { height: foliageHeight } = foliage_sub_block || {};

      const height = get(row, 'reward_chain_sub_block.height');
      const isSubBlock = !foliage_block;

      if (!isFinished) {
        return <i>{foliageHeight}</i>;
      }

      return isSubBlock 
        ? <i>{height}</i>
        : height;
    },
    title: <Trans>Height</Trans>,
  },
  {
    field(row) {
      const {
        isFinished,
      } = row;

      const timestamp = get(row, 'foliage_block.timestamp');
      const value = timestamp;

      return value ? unix_to_short_date(Number.parseInt(value)) : '';
    },
    title: <Trans>Time Created</Trans>,
  },
  {
    field(row) {
      const { isFinished = false } = row;

      return isFinished ? <Trans>Finished</Trans> : <Trans>Unfinished</Trans>;
    },
    title: <Trans>State</Trans>,
  },
];

const getStatusItems = (state, connected) => {
  const status_items = [];
  if (state.sync && state.sync.sync_mode) {
    const progress = state.sync.sync_progress_height;
    const tip = state.sync.sync_tip_height;
    const item = {
      label: <Trans>Status</Trans>,
      value: (
        <Trans>
          Syncing {progress}/{tip}
        </Trans>
      ),
      colour: 'orange',
      tooltip: (
        <Trans>
          The node is syncing, which means it is downloading blocks from other
          nodes, to reach the latest block in the chain
        </Trans>
      ),
    };
    status_items.push(item);
  } else if (!state.sync.synced) {
    const item = {
      label: <Trans>Status</Trans>,
      value: <Trans>Not Synced</Trans>,
      colour: 'red',
      tooltip: <Trans>The node is not synced</Trans>,
    };
    status_items.push(item);
  } else {
    const item = {
      label: <Trans>Status</Trans>,
      value: <Trans>Synced</Trans>,
      colour: '#3AAC59',
      tooltip: (
        <Trans>This node is fully caught up and validating the network</Trans>
      ),
    };
    status_items.push(item);
  }

  if (connected) {
    status_items.push({
      label: <Trans>Connection Status</Trans>,
      value: connected ? (
        <Trans>Connected</Trans>
      ) : (
        <Trans>Not connected</Trans>
      ),
      colour: connected ? '#3AAC59' : 'red',
    });
  } else {
    const item = {
      label: <Trans>Status</Trans>,
      value: <Trans>Not connected</Trans>,
      colour: 'black',
    };
    status_items.push(item);
  }

  const peakHeight = state.peak?.height ?? 0;
  status_items.push({
    label: <Trans>Peak Height</Trans>,
    value: peakHeight,
  });

  const peakTimestamp = state.peak?.timestamp;
  status_items.push({
    label: <Trans>Peak Time</Trans>,
    value: peakTimestamp
      ? unix_to_short_date(Number.parseInt(peakTimestamp))
      : '',
    tooltip: <Trans>This is the time of the latest peak sub block.</Trans>,
  });

  const { difficulty } = state;
  const diff_item = {
    label: <Trans>Difficulty</Trans>,
    value: difficulty,
  };
  status_items.push(diff_item);

  const { sub_slot_iters } = state;
  status_items.push({
    label: <Trans>VDF Sub Slot Iterations</Trans>,
    value: sub_slot_iters,
  });

  const totalIters = state.peak?.total_iters ?? 0;
  status_items.push({
    label: <Trans>Total Iterations</Trans>,
    value: totalIters,
    tooltip: <Trans>Total iterations since the start of the blockchain</Trans>,
  });

  const space_item = {
    label: <Trans>Estimated network space</Trans>,
    value: <FormatBytes value={state.space} precision={3} />,
    tooltip: (
      <Trans>
        Estimated sum of all the plotted disk space of all farmers in the
        network
      </Trans>
    ),
  };
  status_items.push(space_item);

  return status_items;
};

const StatusCell = (props) => {
  const { item } = props;
  const { label } = item;
  const { value } = item;
  const { tooltip } = item;
  const { colour } = item;
  return (
    <Grid item xs={12} md={6}>
      <Flex mb={-2} alignItems="center">
        <Flex flexGrow={1} gap={1} alignItems="center">
          <Typography variant="subtitle1">{label}</Typography>
          {tooltip && (
            <Tooltip title={tooltip}>
              <HelpIcon style={{ color: '#c8c8c8', fontSize: 12 }} />
            </Tooltip>
          )}
        </Flex>
        <Typography variant="subtitle1">
          <span style={colour ? { color: colour } : {}}>{value}</span>
        </Typography>
      </Flex>
    </Grid>
  );
};

const FullNodeStatus = (props) => {
  const blockchain_state = useSelector(
    (state) => state.full_node_state.blockchain_state,
  );
  const connected = useSelector(
    (state) => state.daemon_state.full_node_connected,
  );
  const statusItems =
    blockchain_state && getStatusItems(blockchain_state, connected);

  console.log('blockchain_state', blockchain_state);

  return (
    <Card title={<Trans>Full Node Status</Trans>}>
      {statusItems ? (
        <Grid spacing={4} container>
          {statusItems.map((item) => (
            <StatusCell item={item} key={item.label.props.id} />
          ))}
        </Grid>
      ) : (
        <Flex justifyContent="center">
          <Loading />
        </Flex>
      )}
    </Card>
  );
};

const BlocksCard = () => {
  const { url } = useRouteMatch();
  const history = useHistory();
  const latestBlocks = useSelector((state) => state.full_node_state.latest_blocks ?? []);
  const unfinishedBlockHeaders = useSelector((state) => state.full_node_state.unfinished_block_headers ?? []);

  const rows = [
    ...unfinishedBlockHeaders,
    ...latestBlocks.map(row => ({
      ...row,
      isFinished: true,
    })),
  ];

  function handleRowClick(event, row) {
    const { isFinished, header_hash } = row;

    if (isFinished && header_hash) {
      history.push(`${url}/block/${header_hash}`);
    }
  }

  return (
    <Card title={<Trans>Blocks</Trans>}>
      {rows.length ? (
        <Table cols={cols} rows={rows} onRowClick={handleRowClick} />
      ) : (
        <Flex justifyContent="center">
          <Loading />
        </Flex>
      )}
    </Card>
  );
};

function SearchBlock() {
  const history = useHistory();
  const [searchHash, setSearchHash] = useState('');

  function handleChangeSearchHash(event) {
    setSearchHash(event.target.value);
  }

  function handleSearch() {
    history.push(`/dashboard/block/${searchHash}`);
    setSearchHash('');
  }

  return (
    <Card title={<Trans>Search block by header hash</Trans>}>
      <Flex alignItems="stretch">
        <Box flexGrow={1}>
          <TextField
            fullWidth
            label={<Trans>Block hash</Trans>}
            value={searchHash}
            onChange={handleChangeSearchHash}
            variant="outlined"
          />
        </Box>
        <Button onClick={handleSearch} variant="contained" disableElevation>
          <Trans>Search</Trans>
        </Button>
      </Flex>
    </Card>
  );
}

export default function FullNode() {
  const dispatch = useDispatch();

  const connections = useSelector((state) => state.full_node_state.connections);
  const connectionError = useSelector(
    (state) => state.full_node_state.open_connection_error,
  );

  const openConnectionCallback = (host, port) => {
    dispatch(openConnection(host, port));
  };
  const closeConnectionCallback = (node_id) => {
    dispatch(closeConnection(node_id));
  };

  return (
    <LayoutMain title={<Trans>Full Node</Trans>}>
      <Flex flexDirection="column" gap={3}>
        <FullNodeStatus />
        <BlocksCard />
        <FullNodeConnections
          connections={connections}
          connectionError={connectionError}
          openConnection={openConnectionCallback}
          closeConnection={closeConnectionCallback}
        />
        <SearchBlock />
      </Flex>
    </LayoutMain>
  );
}