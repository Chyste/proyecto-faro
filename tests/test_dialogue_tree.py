from src.checkin.dialogue_tree import TREE
from src.db.catalog import INDICATORS


def test_every_node_edge_points_to_existing_node():
    ids = {n.id for n in TREE.nodes}
    for n in TREE.nodes:
        assert n.default_next is None or n.default_next in ids
        assert all(t in ids for _, t in n.branches)


def test_indicator_nodes_match_catalog_values():
    cat = {i.code: i for i in INDICATORS}
    for n in TREE.nodes:
        if n.indicator_code:
            assert n.kind == cat[n.indicator_code].value_type
            allowed = cat[n.indicator_code].allowed_values or ("si", "no")
            for k, _ in n.branches:
                assert k in allowed or k in ("lista", "vacia")
            assert n.alt_prompt


def test_tree_is_immutable():
    import dataclasses
    import pytest
    with pytest.raises(dataclasses.FrozenInstanceError):
        TREE.nodes[0].prompt = "x"
