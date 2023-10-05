import SchemaBuilder from '@pothos/core';
import SubGraphPlugin from '@pothos/plugin-sub-graph';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';
console.log('hi');

interface SchemaTypes {
  Context: {};
  DefaultFieldNullability: true;
  SubGraphs: 'subgraph1' | 'subgraph2';
}

export const builder = new SchemaBuilder<SchemaTypes>({
  defaultFieldNullability: true,
  plugins: [SubGraphPlugin],
  subGraphs: {
    defaultForTypes: [],
    fieldsInheritFromTypes: true,
  },
});

builder.queryType({ subGraphs: ['subgraph1', 'subgraph2'] });

const MyResponse = builder.objectRef<number>('MyResponse').implement({
  fields: (t) => ({
    value: t.int({
      resolve: (value) => value,
    }),
  }),
});

builder.queryField('someField', (t) => {
  return t.field({
    subGraphs: ['subgraph1'],
    type: MyResponse,
    args: {
      id: t.arg({
        type: 'ID',
      }),
    },
    resolve: (parent, { id }, context, info) => {
      //  does not work
      // @ts-expect-error
      info.cacheControl.setCacheHint({ maxAge: 123 });

      // does not work either
      // cacheControlFromInfo(info).setCacheHint({ maxAge: 123 });

      return 123;
    },
  });
});

const schema = builder.toSchema();

const server = new ApolloServer({
  schema,
  plugins: [ApolloServerPluginCacheControl({
    calculateHttpHeaders: true,
  })],
});

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`🚀  Server ready at: ${url}`);
});
