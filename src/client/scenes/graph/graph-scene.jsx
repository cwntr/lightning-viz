import React from 'react';
import { Graph } from './components/graph';
import { NodeListCard } from './components/node-list/node-list-card';
import { NodeInfoCard } from './components/node-info/node-info-card';

export class GraphScene extends React.Component {
  state = {
    graph: undefined,
    nodeLookup: undefined,
    edgeLookup: undefined,
    selectedNode: undefined,
    selectedNodeChannels: undefined,
    filteredNodes: undefined,
  };

  componentWillMount() {
    this.loadGraph();
  }

  loadGraph() {
    fetch('/api/graph')
      .then(res => res.json())
      .then(graph => {
        let nodeLookup = new Map(graph.nodes.map(node => [node.pub_key, node]));
        let edgeLookup = new Map();
        for (let edge of graph.edges) {
          edgeLookup.set(edge.node1_pub, (edgeLookup.get(edge.node1_pub) || new Set()).add(edge));
          edgeLookup.set(edge.node2_pub, (edgeLookup.get(edge.node2_pub) || new Set()).add(edge));
        }
        let filteredNodes = graph.nodes.slice();
        this.setState({ graph, filteredNodes, nodeLookup, edgeLookup });
        this.graphRef.updateGraph(graph);
      });
  }

  selectNode = pub_key => {
    this.graphRef.selectNode(pub_key);
  };

  highlightNodes = () => {
    let pub_keys = this.state.filteredNodes.map(n => n.pub_key);
    this.graphRef.highlightNodes(pub_keys);
  };

  redrawNodes = () => {
    let nodes = this.state.filteredNodes;
    let pubKeySet = new Set(nodes.map(p => p.pub_key));
    let edges = this.state.graph.edges.filter(
      e => pubKeySet.has(e.node1_pub) && pubKeySet.has(e.node2_pub)
    );
    this.graphRef.redrawGraph({ nodes, edges });
  };

  filterNodes = ({ nodeQuery, showOnlyReachable }) => {
    nodeQuery = nodeQuery.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');

    let nodes = this.state.graph.nodes.filter(
      node =>
        (!showOnlyReachable || (showOnlyReachable && node.is_reachable)) &&
        (!nodeQuery ||
          node.pub_key.match(new RegExp(nodeQuery, 'i')) ||
          (node.alias && node.alias.match(new RegExp(nodeQuery, 'i'))))
    );

    this.setState({ filteredNodes: nodes });
  };

  onNodeSelected = pub_key => {
    let selectedNode = this.state.nodeLookup.get(pub_key);
    let selectedNodeChannels = Array.from(this.state.edgeLookup.get(pub_key));
    this.setState({ selectedNode, selectedNodeChannels });
  };

  render() {
    return (
      <div className="graph-container">
        <Graph
          ref={el => (this.graphRef = el)}
          onNodeSelected={this.onNodeSelected}
          graph={this.state.graph}
        />
        <NodeListCard
          {...this.state}
          filterNodes={this.filterNodes}
          selectNode={this.selectNode}
          highlightNodes={this.highlightNodes}
          redrawNodes={this.redrawNodes}
        />
        <NodeInfoCard {...this.state} />
      </div>
    );
  }
}